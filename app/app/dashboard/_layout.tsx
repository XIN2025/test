import { Tabs } from "expo-router";
import React, { useState } from "react";
import WalkthroughModal from "../WalkthroughModal";

export default function DashboardTabsLayout() {
  const [showWalkthrough, setShowWalkthrough] = useState(true);

  const handleFinishWalkthrough = () => {
    setShowWalkthrough(false);
  };

  return (
    <>
      {showWalkthrough && (
        <WalkthroughModal onFinish={handleFinishWalkthrough} />
      )}
      <Tabs />
    </>
  );
}
