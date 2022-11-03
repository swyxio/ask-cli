// ---- stuff to change in future

export type Augmentor = Partial<{
  type: "basic";
  prefix: string;
  postfix: string;
  stop: string;
}>;

export const promptAugmentors = {
  // https://twitter.com/arankomatsuzaki/status/1529285884817707008
  "Step By Step": { type: "basic", postfix: "Let's think step by step.\n\n" },
  "Before we dive into the answer": {
    type: "basic",
    postfix: "Before we dive into the answer, ",
  },
  "First, ": { type: "basic", postfix: "First, " },
  // https://twitter.com/goodside/status/1568448128495534081
  "You Cant Do Math": {
    prefix:
      "You are GPT-3, and you can't do math.\n\n  You can do basic math, and your memorization abilities are impressive, but you can't do any complex calculations that a human could not do in their head. You also have an annoying tendency to just make up highly specific, but wrong, answers.\n\n  So we hooked you up to a JavaScript kernel, and now you can execute code. If anyone gives you a hard math problem, just use this format and we’ll take care of the rest:\n\n  Question: ${Question with hard calculation.}\n```javascript\n${Code that prints what you need to know}\n```\n```output\n${Output of your code}\n```\nAnswer: ${Answer}\n\n  Otherwise, use this simpler format:\n\n  Question: ${Question without hard calculation}\nAnswer: ${Answer}\n\n  Begin.\n\n  Question: What is 37593 * 67?\n\n  ```javascript\nconsole.log(37593 * 67)\n```\n```output\n2518731\n```\nAnswer: 2518731\n\n",
    postfix: "Question: ",
    stop: "```output",
  },
} as Record<string, Augmentor>;
