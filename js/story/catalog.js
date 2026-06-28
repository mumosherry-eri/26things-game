window.CATALOG_CHAPTERS = [
  {
    id: "start",
    title: "开始",
    entry: "故事的开始",
    matches: [window.STORY_START, "故事的开始"],
    defaults: { variables: {}, memoEntries: [] }
  },
  {
    id: "ambitious",
    title: "第一章 Ambitious",
    entry: "Ambitious_A1",
    prefixes: ["Ambitious_"],
    matches: ["Chat_Caleb1"],
    defaults: { variables: { favorYizhou: 0, favorCaleb: 0, darkness: 0, path: 0 }, memoEntries: [] }
  },
  {
    id: "blur",
    title: "第二章 Blur",
    entry: "Blur",
    prefixes: ["Blur"],
    matches: ["Blur_A1", "Chat_Caleb2", "Chat_Caleb3", "Chat_Caleb4"],
    defaults: { variables: { favorYizhou: 1, favorCaleb: 0, darkness: 0, path: 0 }, memoEntries: [] }
  },
  {
    id: "caleb",
    title: "第三章 Caleb",
    entry: "Caleb-1",
    prefixes: ["Caleb-"],
    defaults: { variables: { favorYizhou: 3, favorCaleb: 7, darkness: 7, path: "casual", liveHabit: "frontrow" }, memoEntries: [] }
  },
  {
    id: "drown",
    title: "第四章 Drown",
    entry: "Drown-1",
    prefixes: ["Drown-"],
    defaults: { variables: { favorYizhou: 3, favorCaleb: 10, darkness: 8, path: "casual", liveHabit: "frontrow", calebAskedToMeet: true, calebInviteTone: "direct" }, memoEntries: [] }
  },
  {
    id: "echo",
    title: "第五章 Echo",
    entry: "Echo-1",
    prefixes: ["Echo-"],
    defaults: { variables: { favorYizhou: 3, favorCaleb: 10, darkness: 8, path: "casual", liveHabit: "frontrow", calebAskedToMeet: true, calebInviteTone: "direct", drownYizhouFollowed: true, drownLotteryReposted: true, drownYizhouAccountSeen: true, drownYizhouPostSeen: true }, memoEntries: [] }
  }
];
