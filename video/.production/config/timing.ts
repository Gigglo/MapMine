export const fps = 60;
export const seconds = (time: number) => Math.round(time * fps);
export const duration = seconds(45);
export const ink = "#151613";
export const paper = "#f7f6f1";
export const blue = "#82baff";
export const sceneStarts = [0, 5, 10, 14, 24, 34, 39] as const;
