import { numberFromHash } from "./random";
import type { IntentClass } from "./types";

type OracleCardOption = {
  title: string;
  verse: string;
  tasks: string[];
  echoQuestions: string[];
};

const ORACLE_CARDS: Record<IntentClass, OracleCardOption[]> = {
  wealth: [
    {
      title: "开源签",
      verse: "钱不是目标，是流动的证据。",
      tasks: ["到达后观察 3 个正在发生交易的细节。", "找到一个你愿意为它付费的小东西。"],
      echoQuestions: ["今天你真正想增加的是什么？", "你看见了哪一种流动？"],
    },
    {
      title: "余量签",
      verse: "先把注意力放在剩余，而不是缺口。",
      tasks: ["到达后停留 90 秒，找一个看起来有余裕的人。", "拍下一个象征“余量”的画面。"],
      echoQuestions: ["你现在最需要留出的余量是什么？", "哪个细节让你感觉世界还有空间？"],
    },
  ],
  inspiration: [
    {
      title: "开窗签",
      verse: "灵感不是想出来的，是被风带进来的。",
      tasks: ["到达后看向最高处，记下第一个进入视线的词。", "沿着最亮的一侧走 30 步。"],
      echoQuestions: ["刚才哪个画面像一个提示？", "如果这个地方给你一句话，会是什么？"],
    },
    {
      title: "借光签",
      verse: "不要急着创造，先向城市借一点光。",
      tasks: ["到达后找一个反光的表面，看 10 秒。", "记录一个你平时会忽略的颜色。"],
      echoQuestions: ["你借到了什么？", "这个颜色让你想到哪件事？"],
    },
  ],
  reunion: [
    {
      title: "回声签",
      verse: "重逢不一定是见面，也可能是重新听见。",
      tasks: ["到达后给一个很久没联系的人发一句问候。", "找一个适合等待的位置停留 2 分钟。"],
      echoQuestions: ["你想重新听见谁的声音？", "这里像不像某段旧时间？"],
    },
    {
      title: "回路签",
      verse: "有些路不是通向别人，是通向从前的自己。",
      tasks: ["到达后向来时方向回望一次。", "找到一个和记忆相似的细节。"],
      echoQuestions: ["你刚才想起了哪一年？", "如果能重逢，你想先说哪句话？"],
    },
  ],
  breakthrough: [
    {
      title: "破口签",
      verse: "不要寻找出口，先走到边界。",
      tasks: ["到达后找一个入口或转角，站在它旁边 1 分钟。", "选择一条你平时不会走的小路。"],
      echoQuestions: ["你今天真正卡住的边界是什么？", "哪个入口看起来不像入口？"],
    },
    {
      title: "换轨签",
      verse: "局不是被解开的，是被换一个角度看穿的。",
      tasks: ["到达后换到街道另一侧观察同一个目标。", "把手机收起来，凭直觉走 20 步。"],
      echoQuestions: ["换角度后，什么变了？", "你能放下哪个旧解法？"],
    },
  ],
  calm: [
    {
      title: "缓行签",
      verse: "慢不是落后，是把自己重新交还给身体。",
      tasks: ["到达后把步速放慢一半，走完 60 步。", "找到一个可以安静呼吸 5 次的位置。"],
      echoQuestions: ["你的身体刚才先放松了哪里？", "这个地方让什么声音变小了？"],
    },
    {
      title: "归位签",
      verse: "平静不是没有波动，是知道自己在哪里。",
      tasks: ["到达后看一眼天空，再看一眼脚下。", "用一句话描述你此刻的位置。"],
      echoQuestions: ["你现在在哪里？", "哪一个细节让你回到当下？"],
    },
  ],
  unknown: [
    {
      title: "未知签",
      verse: "答案暂时没有名字，所以先给它一个方向。",
      tasks: ["到达后选择一个最普通的物体，认真看 20 秒。", "把第一眼看到的文字记下来。"],
      echoQuestions: ["你刚才遇见了什么未命名的东西？", "这个坐标像是在回答哪个问题？"],
    },
    {
      title: "试探签",
      verse: "先走一步，城市会补上下一句。",
      tasks: ["到达后向左或向右任选一个方向走 33 步。", "找一个让你愿意停下来的理由。"],
      echoQuestions: ["下一句是什么？", "你为什么在那里停下？"],
    },
  ],
};

export function buildOracleCard(intentClass: IntentClass, hash: string) {
  const options = ORACLE_CARDS[intentClass];
  const card = options[numberFromHash(hash, 20, 4) % options.length];
  return {
    title: card.title,
    verse: card.verse,
    task: card.tasks[numberFromHash(hash, 24, 4) % card.tasks.length],
    echoQuestion: card.echoQuestions[numberFromHash(hash, 28, 4) % card.echoQuestions.length],
  };
}
