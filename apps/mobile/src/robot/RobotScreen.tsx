import {
  Brain,
  ExternalLink,
  HardDrive,
  type LucideIcon,
  PanelsTopLeft,
  Puzzle,
  Settings,
  Smartphone,
  Wallet,
} from "lucide-react-native";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Button, LinkRow } from "../ui";
import { DevicesPage } from "./DevicesPage";
import { robotLayoutFor } from "./layout";
import { MemoryPage } from "./MemoryPage";
import { MorePage } from "./MorePage";
import { type PageIcon, type PageId, ROBOT_PAGES } from "./pages";
import { RobotOverview } from "./RobotOverview";
import { SessionsPage } from "./SessionsPage";
import { SettingsPage } from "./SettingsPage";
import { SkillsPage } from "./SkillsPage";
import { SpendPage } from "./SpendPage";

const ICONS: Record<PageIcon, LucideIcon> = {
  overview: PanelsTopLeft,
  memory: Brain,
  skills: Puzzle,
  devices: HardDrive,
  spend: Wallet,
  phones: Smartphone,
  more: ExternalLink,
  settings: Settings,
};

function PageContent({ page, onOpenPage }: { page: PageId; onOpenPage: (page: PageId) => void }) {
  switch (page) {
    case "overview":
      return <RobotOverview onOpenPage={onOpenPage} />;
    case "memory":
      return <MemoryPage />;
    case "skills":
      return <SkillsPage />;
    case "devices":
      return <DevicesPage />;
    case "spend":
      return <SpendPage />;
    case "phones":
      return <SessionsPage />;
    case "more":
      return <MorePage />;
    case "settings":
      return <SettingsPage />;
  }
}

export function RobotScreen() {
  const { width } = useWindowDimensions();
  const layout = robotLayoutFor(width);
  const [page, setPage] = useState<PageId>("overview");

  const content = <PageContent page={page} onOpenPage={setPage} />;

  if (layout === "split") {
    return (
      <View style={{ flexDirection: "row", gap: 18, alignItems: "flex-start" }}>
        <View style={{ width: 208, gap: 2 }}>
          {ROBOT_PAGES.map((entry) => (
            <LinkRow
              key={entry.id}
              title={entry.title}
              icon={ICONS[entry.icon]}
              onPress={() => setPage(entry.id)}
            />
          ))}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>{content}</View>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {page === "overview" ? null : (
        <Button small onPress={() => setPage("overview")}>
          Back to overview
        </Button>
      )}
      {content}
      {page === "overview" ? (
        <View style={{ gap: 2 }}>
          <LinkRow title="Settings" icon={ICONS.settings} onPress={() => setPage("settings")} />
        </View>
      ) : null}
    </View>
  );
}
