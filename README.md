# ask CLI

Ask is a Deno CLI for pinging GPT-3 and iterating with chain of thought prompting and other prompt engineering tricks.

## Install instructions

We use [`deno compile`](https://deno.land/manual@v1.27.0/tools/compiler) to ship a dedicated executable for each system architecture.

See the Releases page to download the appropriate binaries.

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

## Local Dev

Make sure to have Deno installed.

Then, you can either:

- `deno run -A index.ts "how do i sample from a normal distribution from scratch in python?"` for local dev
- `npm run build && ./builds/askcli "Shawn has five toys. For Christmas, he got two toys each from his mom and dad. How many toys does he have now?"` to do a production build