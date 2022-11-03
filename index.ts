import {
  Command,
  EnumType,
} from "https://deno.land/x/cliffy@v0.25.4/command/mod.ts";
import { promptAugmentors, Augmentor } from "./promptAugmentors.ts";
import { Input } from "https://deno.land/x/cliffy@v0.25.4/prompt/input.ts";
import { Checkbox } from "https://deno.land/x/cliffy@v0.25.4/prompt/checkbox.ts";
import { Select } from "https://deno.land/x/cliffy@v0.25.4/prompt/select.ts";
import { Table } from "https://deno.land/x/cliffy@v0.25.4/table/mod.ts";
// import { Secret } from "https://deno.land/x/cliffy@v0.25.4/prompt/secret.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.4/ansi/mod.ts";
// import { Aes } from "https://deno.land/x/crypto/aes.ts";
// import { Cbc, Padding } from "https://deno.land/x/crypto/block-modes.ts";

let basePrompt = "";
const currentPrompt = colors.bold.blue;
const showNext = colors.bold.yellow;
const system = colors.bold.cyan;
const logLevelType = new EnumType(["debug", "info", "warn", "error"]);
const te = new TextEncoder();
// const de = new TextDecoder();
// const key = te.encode("SuperDuperSecret");
// const iv = new Uint8Array(16);

await new Command()
  .name("ask")
  .version("0.0.1")
  .description(
    "Ask CLI is a command line tool for pinging GPT3 in the command line."
  )
  .type("log-level", logLevelType)
  // .env("DEBUG=<enable:boolean>", "Enable debug output.")
  .globalEnv("OPENAI_API_KEY=<value:string>", "OpenAI API key...", {
    required: true,
  })
  .option("-d, --debug", "Enable debug output.")
  // .option("-k, --key <key:string>", "Set OpenAI API key.")
  // .option("-l, --log-level <level:log-level>", "Set log level.", {
  //   default: "info" as const,
  // })
  .arguments("<prompt:string>")
  // .arguments("<input:string> [output:string]")
  .action(async (options, ...args) => {
    if (options.debug) {
      console.log(system("Debug mode enabled."));
      console.log({ options });
      console.log(system("End debug mode."));
    }
    async function pingGPT3(
      prompt: string,
      openaiApiKey: string,
      gpt3options: Object
    ) {
      if (options.debug) console.log("log pingGPT3", { prompt });
      const res = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          prompt: prompt,
          // defaults
          model: "text-davinci-002",
          max_tokens: 256,
          temperature: 0.3,
          top_p: 0.9,
          n: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          stop: ["```output"],
          // override defaults
          ...gpt3options,
        }),
      });
      let x = await res.json();
      x = x.choices[0].text.trim();
      // https://replit.com/@amasad/gptpy?v=1#main.py
      if (options.debug) {
        console.log("------GPT3 response------------");
        console.log(x);
        console.log("------GPT3 response------------");
      }
      if (x.startsWith("```javascript")) {
        const code = x.slice(13, -3);
        console.log("------Executing...------------");
        console.log(code);
        console.log("------Done!-------------------");
        // https://stackoverflow.com/questions/46417440/how-to-get-console-log-output-from-eval
        const str = `
        (function() {
          console.oldLog = console.log;
          let output = "";
          console.log = function(value){
              output += value
          };
          ${code}
          console.log = console.oldLog;
          return output.trim();
        }())
        `;
        const result = eval(str);
        x = `Eval Answer: ${result}`;
        // let response = await exec(code, {output: OutputMode.Capture});
      }
      return x;
    }
    basePrompt = args[0];
    const promptStack = [] as Augmentor[];
    let nextPrompt = null as Augmentor | null;
    function compilePrompt(pStack: Augmentor[], candidate: Augmentor) {
      let result = "";
      result += candidate.prefix ?? "";
      for (const augmentor of pStack) {
        result += augmentor.prefix ?? "";
      }
      result += basePrompt;
      for (const augmentor of pStack) {
        result += augmentor.postfix ?? "";
      }
      result += candidate.postfix ?? "";
      return result;
    }

    console.log(currentPrompt(basePrompt));
    while (true) {
      if (options.debug) {
        console.log("start cycle", { promptStack, nextPrompt });
      }
      nextPrompt = nextPrompt ?? { postfix: "" };
      const answer = await pingGPT3(
        compilePrompt(promptStack, nextPrompt),
        options.openaiApiKey,
        {}
      );
      if (options.debug) console.log("log1", { answer });
      if (answer === "") {
        console.log(
          system(
            "GPT3 returned an empty string. We reached a stop sequence. Pop the stack or Ctrl+C exit."
          )
        );
      } else {
        console.log(showNext("GPT3 response: "));
        console.log(answer);
      }
      console.log("\n ---------- \n");
      const choices: string[] = await Checkbox.prompt({
        message: "What do you want to do with this response?",
        options: [
          Checkbox.separator("---Run Prompt candidates in Parallel!-----"),
          { name: "Display progress so far", value: "$display" },
          { name: "Rewrite current prompt", value: "$rewrite" },
          ...Object.entries(promptAugmentors).map(([augName, augData]) => {
            return { name: `Add "${augName.trim()}"`, value: augName };
          }),
          Checkbox.separator(
            "---Interrupts (choosing one of these overrides all others). Use Ctrl+C to exit-----"
          ),
          { name: "Pop previous candidate off prompt stack", value: "$back" },
          {
            name: "Add to prompt stack, get GPT3 to continue",
            value: "$continue",
          },
        ],
      });
      if (choices.length === 0) {
        continue;
      }
      if (choices.includes("$display")) {
        console.log(system("---- Prompt Progress: ----"));
        console.log(currentPrompt(basePrompt));
        console.log(showNext("prompt Stack:"));
        console.log(promptStack.join("\n"));
        console.log(showNext("current candidate:"));
        console.log(JSON.stringify(nextPrompt));
        console.log(system("---- End of Progress Print ----"));
        console.log(" ");
      }
      if (choices.includes("$back")) {
        if (promptStack.length > 1) {
          nextPrompt = promptStack.pop() || {};
          continue; // next iteration
        } else {
          console.log(system("Can't go back any further."));
          continue; // next iteration
        }
      }
      if (choices.includes("$continue")) {
        promptStack.push(nextPrompt);
        continue;
      }

      // run searches in parallel from here
      const values = await Promise.all(
        choices.map(async (choice) => {
          let value;
          let rewriteMsg = "";
          let augData = {} as Augmentor;
          if (choice === "$rewrite") {
            console.log(system(`[extra info needed for rewriting prompt]`));
            rewriteMsg = await Input.prompt({
              message:
                "What do you want to rewrite the prompt to? (press up for suggestion)",
              minLength: 1,
              // info: true,
              suggestions: [answer],
            });
            augData = { postfix: rewriteMsg } as Augmentor;
            value = await pingGPT3(
              compilePrompt(promptStack, augData),
              options.openaiApiKey,
              {}
            );
          } else if (choice in promptAugmentors) {
            augData = promptAugmentors[choice as keyof typeof promptAugmentors];
            value = await pingGPT3(
              compilePrompt(promptStack, augData),
              options.openaiApiKey,
              {}
            );
          }
          return {
            name: choice === "$rewrite" ? rewriteMsg : choice,
            value: value,
            augData,
          };
        })
      );
      if (values.length === 1) {
        // just immediately print out the value and carry on
        if (options.debug) console.log("log2", { values });
        if (values[0].value === "") {
          console.log(
            showNext(
              "Null response from GPT3. We may have reached a natural stop sequence. Pop the stack or Ctrl+C to exit."
            )
          );
        }
        console.log(currentPrompt(values[0].value));
        nextPrompt = values[0].augData;
      } else {
        values.push({
          name: "accept current candidate without rewrite",
          value: answer,
          augData: { postfix: answer },
        });
        if (options.debug) console.log("table", { values });
        // const table: Table =
        new Table()
          .header(["Candidate", "GPT3 Response"])
          .body(values.map(({ value, name }) => [name, value]))
          .padding(1)
          .indent(2)
          .maxColWidth(60)
          .border(true)
          .render();

        const selectedCandidate = await Select.prompt({
          message: "Pick a candidate you like to add onto the prompt stack.",
          options: values,
        });
        console.log(showNext(selectedCandidate));
        if (options.debug) console.log("log3", { selectedCandidate });
        nextPrompt = values.find((x) => x.value === selectedCandidate)!.augData;
      }
    }
  })
  // // Child command 1.
  // .command("clear", "Foo sub-command.")
  // .option("-f, --foo", "Foo option.")
  // // .arguments("<value:string>")
  // .action((options, ...args) => localStorage.clear())
  .parse(Deno.args);


// // cant do these yet https://github.com/denoland/deno/issues/10693
// function encryptAndSaveKey(apikey: string) {
//   // const data = te.encode(apikey);
//   // const cipher = new Cbc(Aes, key, iv, Padding.PKCS7);

//   // const encrypted = cipher.encrypt(data);
//   // localStorage.setItem("myDemo", de.decode(encrypted));
//   localStorage.setItem("myDemo", apikey);
// }
// async function getAndDecryptKey() {
//   const encrypted = localStorage.getItem("myDemo");
//   // console.log({ encrypted: te.encode(encrypted) });
//   if (encrypted) {
//     // const decipher = new Cbc(Aes, key, iv, Padding.PKCS7);
//     // return decipher.decrypt(te.encode(encrypted));
//     return encrypted;
//   } else {
//     const password = await Secret.prompt(
//       "Enter your OpenAI API key (will be encrypted):"
//     );
//     await encryptAndSaveKey(password);
//     return password;
//   }
// }
