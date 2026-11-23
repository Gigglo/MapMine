"""Synthesize the original MapMine soundtrack and subtle UI cues offline."""
import wave
from pathlib import Path
import numpy as np

RATE = 44100
DURATION = 45
N = RATE * DURATION
TAU = 2 * np.pi
OUT = Path(__file__).resolve().parents[1] / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(308)
score = np.zeros((N, 2), dtype=np.float32)
effects = np.zeros_like(score)

def tone(dest, start, length, hz, volume, pan=0, kind="keys"):
    i = int(start * RATE)
    count = min(int(length * RATE), N - i)
    t = np.arange(count) / RATE
    phase = TAU * hz * t
    if kind == "pad":
        signal = (np.sin(phase) + .14 * np.sin(2.002 * phase) + .11 * np.sin(1.006 * phase))
        envelope = np.sin(np.pi * t / length) ** 1.35
    elif kind == "click":
        signal = .55 * np.sin(phase + TAU * 110 * (1 - np.exp(-8*t))) + .15 * rng.uniform(-1,1,count)
        envelope = np.minimum(t/.008, 1) * np.exp(-14*t)
    else:
        signal = np.sin(phase) + .21 * np.sin(2.001 * phase) * np.exp(-2*t) + .09 * np.sin(3.003 * phase) * np.exp(-6*t)
        envelope = np.minimum(t/.024, 1) * np.exp(-2.5*t) * np.minimum((length-t)/.20, 1)
    shape = volume * signal * envelope
    dest[i:i+count, 0] += shape * np.sqrt((1-pan)/2)
    dest[i:i+count, 1] += shape * np.sqrt((1+pan)/2)

def hz(note):
    return 440 * 2 ** ((note - 69)/12)

chords = [[45, 52, 59, 64], [41, 48, 55, 60], [48, 55, 62, 67], [43, 50, 57, 62]]
for bar in range(16):
    start = bar * 2.75
    chord = chords[bar % 4]
    for note_index, note in enumerate(chord):
        tone(score, start, 4.05, hz(note), .043 if note_index < 2 else .027, (note_index-1.5)*.30, "pad")
    if bar > 0:
        for j, delay in enumerate([.04,.72,1.40,2.08] if 5 <= bar <= 12 else [.14,1.48]):
            note = chord[[1,3,2,3][j]] + (12 if j % 2 else 0)
            tone(score, start+delay, 1.67, hz(note), .035, (-1)**j*.28)
            tone(score, start+delay+.23, 1.48, hz(note), .012, (-1)**(j+1)*.57)
for i, at in enumerate([.36, 1.87, 5.28, 10.34, 14.25, 17.18, 20.57, 24.27, 27.47, 30.77, 34.27, 39.35, 41.15]):
    tone(effects, at, .57, hz([57,60,64,67][i % 4]), .105, (-1)**i*.24, "click")
    if i in [3, 10, 12]:
        tone(effects, at+.085, .64, hz(76), .066, .29)
fade = np.minimum(np.arange(N) / (RATE*.85), 1) * np.minimum(np.arange(N)[::-1] / (RATE*2.2), 1)
score *= fade[:, None]
for name, data in [("mapmine-score.wav", score), ("mapmine-cues.wav", effects)]:
    with wave.open(str(OUT / name), "wb") as audio:
        audio.setparams((2, 2, RATE, 0, "NONE", "not compressed"))
        audio.writeframes((np.clip(data * 3.1, -1, 1) * 32767).astype("<i2").tobytes())
