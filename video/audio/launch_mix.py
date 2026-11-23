"""Generate the 45-second MapMine launch mix with NumPy."""
from pathlib import Path
import wave

import numpy as np

RATE = 44100
LENGTH = 45
BEAT = .5
TAU = 2 * np.pi
rng = np.random.default_rng(47)
mix = np.zeros((RATE * LENGTH, 2), dtype=np.float32)
out = Path(__file__).resolve().parents[1] / "public/audio/mapmine-launch-mix.wav"


def time(length):
    return np.arange(round(length * RATE)) / RATE


def add(at, signal, level, pan=0):
    start = round(at * RATE)
    signal = signal[:len(mix) - start]
    mix[start:start + len(signal)] += signal[:, None] * level * np.sqrt([(1 - pan) / 2, (1 + pan) / 2])


def keys(note, length, attack=.018):
    t = time(length)
    phase = TAU * 440 * 2 ** ((note - 69) / 12) * t
    tone = np.sin(phase + .28 * np.sin(phase * 2) * np.exp(-4 * t))
    tone += .22 * np.sin(phase * 2.002) * np.exp(-2.7 * t)
    tone += .07 * np.sin(phase * 3.01) * np.exp(-8 * t)
    return tone * np.minimum(t / attack, 1) * np.exp(-2.1 * t) * np.minimum((length - t) / .19, 1)


def drum(length, decay, smooth=1):
    t = time(length)
    noise = rng.standard_normal(len(t))
    if smooth > 1:
        noise = np.convolve(noise, np.ones(smooth) / np.sqrt(smooth), "same")
    return noise * np.minimum(t / .004, 1) * np.exp(-decay * t)


t = time(.43)
kick = np.sin(TAU * (45*t + 52*(1-np.exp(-40*t))/40))
kick *= np.minimum(t/.005, 1) * np.exp(-12*t)
t = time(.22)
snare = .76 * drum(.22, 24, 4) + .24 * np.sin(TAU * 184 * t) * np.exp(-33*t)
hat = drum(.091, 60)
chords = [
    (50, (57, 60, 64, 65)),  # Dm9
    (46, (57, 60, 62, 65)),  # Bbmaj9
    (53, (57, 60, 64, 67)),  # Fmaj9
    (48, (55, 60, 62, 64)),  # Cadd9
]
for bar in range(22):
    at = bar * 4 * BEAT
    root, voicing = chords[bar % len(chords)]
    if at >= 40:
        root, voicing = 53, (57, 60, 64, 67)
    for i, note in enumerate(voicing):
        voice = keys(note, 2.17, .041)
        add(at + i * .015, voice, .14, (i - 1.5) * .31)
        add(at + .18 + i * .015, voice, .025, (1.5 - i) * .39)
    if 4 <= at < 40:
        for beat in (0, 1.5, 3):
            add(at + beat * BEAT, keys(root - 12, .67, .026), .23)
    if 8 <= at < 39:
        melody = (voicing[1] + 12, voicing[2] + 12, voicing[0] + 12)
        for i, beat in enumerate((.75, 2.5, 3.5)):
            note = keys(melody[i], .66)
            add(at + beat * BEAT, note, .094, -.23)
            add(at + beat * BEAT + .375, note, .031, .41)

for i in range(78):
    at = i * BEAT
    if at < 5:
        continue
    lift = .72 if at < 14 or at >= 34 else 1
    if i % 4 in (0, 2) or at in (5, 39):
        add(at, kick, .40 * lift)
    if 10 <= at < 39 and i % 2:
        add(at, snare, .13 * lift, -.10)
    if 10 <= at < 38:
        add(at + .25, hat, .039 * lift, (-1)**i * .34)

# Cue notes sit under the scene and feature changes.
for index, (at, note) in enumerate((
    (5, 69), (10, 72), (14, 74), (17.1, 69), (20.5, 72),
    (24, 76), (27.2, 74), (30.5, 77), (34, 72), (39, 77),
)):
    voice = keys(note, 1.05, .035)
    add(at, voice, .105, .22)
    add(at + .19, voice, .028, -.36)
    if index in (2, 5, 9):
        add(at, kick, .14)

for i, note in enumerate((41, 57, 60, 64, 65)):
    add(43 + i * .026, keys(note, 2.15, .065), .13, (i-2)*.22)

t = time(LENGTH)
mix *= (np.minimum(t / .19, 1) * np.clip((LENGTH - t) / 1.35, 0, 1) ** 2)[:, None]
mix = np.tanh(mix * 1.8)
mix *= .8 / np.max(np.abs(mix))
with wave.open(str(out), "wb") as audio:
    audio.setparams((2, 2, RATE, 0, "NONE", "not compressed"))
    audio.writeframes((mix * 32767).astype("<i2").tobytes())

# Three quiet key taps land on the opening question's line entrances.
typing = np.zeros((round(2.5 * RATE), 2), dtype=np.float32)
for frame, level, pan in ((110, .071, -.18), (121, .055, .14), (134, .078, -.06)):
    at = round(frame * RATE / 60)
    t = time(.074)
    noise = rng.standard_normal(t.size)
    softened = np.convolve(noise, [.15, .35, .35, .15], "same")
    body = np.sin(TAU * 410 * t) * np.exp(-110 * t)
    tap = (.69 * softened + .31 * body) * np.minimum(t / .0018, 1) * np.exp(-82 * t)
    typing[at:at + len(t)] += tap[:, None] * level * np.sqrt([(1 - pan) / 2, (1 + pan) / 2])

with wave.open(str(out.with_name("typing-cues.wav")), "wb") as audio:
    audio.setparams((2, 2, RATE, 0, "NONE", "not compressed"))
    audio.writeframes((typing * 32767).astype("<i2").tobytes())
