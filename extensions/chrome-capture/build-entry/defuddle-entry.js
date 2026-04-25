import { Defuddle } from "defuddle";

// 暴露给 content script 使用。bundler 会把整个 Defuddle 实例打成 IIFE，
// `globalName: "PineSnapDefuddle"` 会创建 globalThis.PineSnapDefuddle = { Defuddle }。
export { Defuddle };
