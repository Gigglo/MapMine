import { useState } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { ChevronDown, ChevronRight, Share2, Trophy } from "lucide-react-native";
import { router } from "expo-router";
import { Card, Page, Section, Stat, styles, tap } from "../components/ui/primitives";
import BadgeImage from "../features/achievements/BadgeImage";
import AchievementStory, { type EarnedStory } from "../features/achievements/AchievementStory";
import { advancedMilestones, coreMilestones, levelFor, milestones } from "../features/achievements/milestones";
import { useSession } from "../store/session";
import { interfaceEggs } from "../features/easterEggs/catalog";
import { discoverEgg } from "../features/easterEggs/discovery";
import { colors } from "../theme/color";

export default function AchievementsScreen({ onSheetBack }: { onSheetBack?: () => void } = {}) {
  const summary = useSession(state => state.summary);
  const [story, setStory] = useState<EarnedStory | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const unlocked = summary?.unlocked ?? [];
  const xp = unlocked.reduce((total, item) => total + item.xp, 0);
  return <Page title="Achievements" onTitleLongPress={() => void discoverEgg(interfaceEggs.achievements)} embedded={Boolean(onSheetBack)} onBack={onSheetBack ?? (() => router.navigate("/"))}>
    <Card><View style={styles.row}>
      <View style={local.badge}><Trophy size={23} color={colors.text} /></View>
      <Stat label={`${xp} XP · ${250 - xp % 250} XP to next level`} value={`Level ${levelFor(xp)}`} />
    </View><View style={local.track}><View style={[local.fill, { width: `${xp % 250 / 2.5}%` }]} /></View></Card>
    {[{ title: `Milestones · ${unlocked.length}/${milestones.length}`, items: coreMilestones },
      { title: "Long-term challenges", items: advancedMilestones }].map(group => <Section key={group.title} title={group.title}>
      {group.items.map(item => {
        const award = unlocked.find(value => value.id === item.id);
        const progress = Math.min(1, (summary?.metrics[item.metric] ?? 0) / item.target);
        const open = expanded === item.id;
        const Chevron = open ? ChevronDown : ChevronRight;
        return <View key={item.id}
          style={[local.milestone, award && local.earned]}>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }}
              onPress={() => { tap(); setExpanded(open ? null : item.id); }}
              style={({ pressed }) => [local.detailsButton, pressed && local.sharePressed]}>
              <BadgeImage id={item.id} size={42} muted={!award} />
              <View style={styles.flex}><Text style={styles.heading}>{item.name}</Text>
                <Text style={styles.secondary}>{award ? "Earned" : `${item.xp.toLocaleString()} XP`}</Text></View>
              <Chevron color={colors.textSecondary} size={15} />
            </Pressable>
            {award ? <Pressable accessibilityRole="button" accessibilityLabel={`Share ${item.name}`}
              onPress={() => { tap(); setStory({ milestone: item, award }); }}
              style={({ pressed }) => [local.share, pressed && local.sharePressed]}>
              <Share2 size={17} color={colors.text} />
            </Pressable> : null}
          </View>
          {open && <View style={local.detail}>
          <Text style={styles.text}>{item.description}</Text>
          <View style={local.track}><View style={[local.fill, award && local.unlocked, { width: `${award ? 100 : progress * 100}%` }]} /></View>
          <Text style={styles.secondary}>{award ? "Earned " + new Date(award.timestamp).toLocaleDateString() :
            (progress > 0 && progress < 0.01 ? "<1" : Math.floor(progress * 100)) + "% complete"}</Text>
          </View>}
        </View>;
      })}
    </Section>)}
    {story && <AchievementStory key={story.award.id} {...story} onClose={() => setStory(null)} />}
  </Page>;
}

const local = StyleSheet.create({
  milestone: { gap: 6, paddingVertical: 3, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 5 },
  earned: { borderWidth: 2, borderColor: "#cfcfcf", backgroundColor: "#191919" },
  detailsButton: { flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 10, borderRadius: 10 },
  detail: { paddingLeft: 56, paddingRight: 10, paddingBottom: 9, gap: 7 },
  badge: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" },
  share: { width: 44, height: 44, justifyContent: "center", alignItems: "center", borderRadius: 12 },
  sharePressed: { backgroundColor: colors.elevated },
  track: { height: 4, borderRadius: 3, overflow: "hidden", backgroundColor: colors.elevated },
  fill: { backgroundColor: colors.text, height: "100%", borderRadius: 3 },
  unlocked: { backgroundColor: "#fff" },
});
