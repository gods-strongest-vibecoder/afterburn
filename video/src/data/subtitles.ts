// Subtitle timing data - synced to absolute scene frames
export type SubtitleEntry = {
  text: string;
  startFrame: number;
  endFrame: number;
};

export const subtitles: SubtitleEntry[] = [
  { text: "Your site looks perfect.", startFrame: 91, endFrame: 150 },
  { text: "But is it?", startFrame: 151, endFrame: 240 },
  { text: "One command.", startFrame: 270, endFrame: 300 },
  { text: "Every bug. Found automatically.", startFrame: 301, endFrame: 330 },
  { text: "Clicks every button. Fills every form.", startFrame: 331, endFrame: 450 },
  { text: "Tests your entire site in seconds.", startFrame: 451, endFrame: 600 },
  { text: "52 issues. Ranked by priority.", startFrame: 601, endFrame: 690 },
  { text: "Every issue explained in plain English.", startFrame: 691, endFrame: 810 },
  { text: "Two reports. One for you, one for AI.", startFrame: 811, endFrame: 870 },
  { text: "Paste the report into Claude.", startFrame: 871, endFrame: 930 },
  { text: "Watch it fix the bugs.", startFrame: 931, endFrame: 1020 },
  { text: "No manual debugging. Ever.", startFrame: 1021, endFrame: 1200 },
  { text: "62 → 92. All critical issues resolved.", startFrame: 1201, endFrame: 1320 },
  { text: "afterburn. Test smarter, ship faster.", startFrame: 1321, endFrame: 1350 },
];
