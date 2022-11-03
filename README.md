# ask CLI

Ask is a Deno CLI for pinging GPT-3 and iterating with chain of thought prompting and [other prompt engineering tricks](https://github.com/sw-yx/prompt-eng/blob/main/GPT.md).

> Inspired by [Linus' prototype](https://twitter.com/thesephist/status/1587593832002072576) (his impl [here](https://gist.github.com/thesephist/28786aa80ac6e26241116c5ed2be97ca))

![image](https://user-images.githubusercontent.com/6764957/199749592-fd252e21-0da3-4c31-8497-ee17d37e803f.png)

But it can also iterate on prompts:

![image](https://user-images.githubusercontent.com/6764957/199750459-83968ede-539b-4508-9535-98cfdc40b245.png)

And then it runs them in parallel for you to choose:

![image](https://user-images.githubusercontent.com/6764957/199750666-0a1489b6-8bea-4657-8b16-329c06e1e03e.png)

## Install instructions

We use [`deno compile`](https://deno.land/manual@v1.27.0/tools/compiler) to ship a dedicated executable for each system architecture.

See [the Releases page](https://github.com/sw-yx/ask-cli/releases) to download the appropriate binaries.

> If you know what you're doing, you may also just run from source locally, see Local Dev below

Put the binary in your $PATH or just navigate your terminal to the folder where it is.

## Usage instructions

These instructions are for Mac, but you should be able to adjust for Linux/Windows accordingly.

First get your OpenAI API Key from: https://beta.openai.com/account/api-keys

Then:

```bash
export OPENAI_API_KEY=sk_your_api_key_here
ask "How much wood would a woodchuck chuck if a woodchuck could chuck wood?"
```

By default you get a panel of options, but you can always exit with Ctrl+C.

The real power of this CLI comes from chaining prompts. You can run candidate prompts in parallel and choose prompts based on the responses.

![image](https://user-images.githubusercontent.com/6764957/199750459-83968ede-539b-4508-9535-98cfdc40b245.png)

And then it runs them in parallel for you to choose:

![image](https://user-images.githubusercontent.com/6764957/199750666-0a1489b6-8bea-4657-8b16-329c06e1e03e.png)

## Local Dev

Make sure to have Deno installed.

Then, you can either:

- `deno run -A index.ts "how do i sample from a normal distribution from scratch in python?"` for local dev
- `npm run build && ./builds/askcli "Shawn has five toys. For Christmas, he got two toys each from his mom and dad. How many toys does he have now?"` to do a production build

Debugging:

```bash
deno run --inspect-brk  -A index.ts -d "How many of the integers between 0 and 99 inclusive are divisible by 8?"
```

and then open `chrome://inspect`, open the directory in devtools and put in breakpoints.
