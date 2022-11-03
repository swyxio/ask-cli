import {
  Command,
  EnumType,
} from "https://deno.land/x/cliffy@v0.25.4/command/mod.ts";
import { Input } from "https://deno.land/x/cliffy@v0.25.4/prompt/input.ts";
import { Checkbox } from "https://deno.land/x/cliffy@v0.25.4/prompt/checkbox.ts";
import { Select } from "https://deno.land/x/cliffy@v0.25.4/prompt/select.ts";
import { Table } from "https://deno.land/x/cliffy@v0.25.4/table/mod.ts";
// import { Secret } from "https://deno.land/x/cliffy@v0.25.4/prompt/secret.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.4/ansi/mod.ts";
// import { Aes } from "https://deno.land/x/crypto/aes.ts";
// import { Cbc, Padding } from "https://deno.land/x/crypto/block-modes.ts";

const currentPrompt = colors.bold.blue;
const showNext = colors.bold.yellow;
const system = colors.bold.cyan;
const logLevelType = new EnumType(["debug", "info", "warn", "error"]);
const te = new TextEncoder();
// const de = new TextDecoder();
// const key = te.encode("SuperDuperSecret");
// const iv = new Uint8Array(16);

await new Command()
  .name("askcli")
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
  .option("-k, --key <key:string>", "Set OpenAI API key.")
  .option("-l, --log-level <level:log-level>", "Set log level.", {
    default: "info" as const,
  })
  .arguments("<prompt:string>")
  // .arguments("<input:string> [output:string]")
  .action(async (options, ...args) => {
    if (options.debug) {
      console.log(system("Debug mode enabled."));
      console.log({ options });
      console.log(system("End debug mode."));
    }

    const promptAugmentors = ["Let's think step by step."];
    const promptStack = [args[0]];
    let nextPrompt = "------";

    console.log(currentPrompt(promptStack[0]));
    while (true) {
      if (options.debug) {
        console.log("start cycle", { promptStack, nextPrompt });
      }
      let body = await pingGPT3(
        promptStack.concat(nextPrompt).join("/n"),
        options.openaiApiKey,
        {}
      );
      if (options.debug) console.log("log1", { body });
      // await Deno.stdout.write(new TextEncoder().encode(body.choices[0].text));
      nextPrompt = body.choices[0].text.trim().trim();
      if (nextPrompt === "") {
        console.log(
          system(
            "GPT3 returned an empty string. We reached a stop sequence. Pop the stack or Ctrl+C exit."
          )
        );
      } else {
        console.log("GPT3 response: " + showNext(nextPrompt));
      }
      const choices: string[] = await Checkbox.prompt({
        message: "What do you want to do with this response?",
        options: [
          Checkbox.separator(
            "---Interrupts (choosing one of these overrides all others). Use Ctrl+C to exit-----"
          ),
          { name: "Pop previous candidate off prompt stack", value: "$back" },
          {
            name: "Add to prompt stack, get GPT3 to continue",
            value: "$continue",
          },
          Checkbox.separator("---Run Prompt candidates in Parallel!-----"),
          { name: "Display progress so far", value: "$display" },
          { name: "Rewrite current prompt", value: "$rewrite" },
          ...promptAugmentors.map((augmentor) => {
            return { name: `Add "${augmentor}"`, value: augmentor };
          }),
        ],
      });
      if (choices.length === 0) {
        continue;
      }
      if (choices.includes("$display")) {
        console.log(system("---- Prompt Progress: ----"));
        console.log(promptStack.join("/n"));
        console.log(showNext(nextPrompt));
        console.log(system("---- End of progprint ----"));
      }
      if (choices.includes("$back")) {
        if (promptStack.length > 1) {
          nextPrompt = promptStack.pop() || "";
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
          if (choice === "$rewrite") {
            console.log(system(`[extra info needed for rewriting prompt]`));
            rewriteMsg = await Input.prompt({
              message:
                "What do you want to rewrite the prompt to? (press up for suggestion)",
              minLength: 1,
              // info: true,
              suggestions: [nextPrompt],
            });
            value = await pingGPT3(
              promptStack.concat(rewriteMsg).join("/n"),
              options.openaiApiKey,
              {}
            );
            value = value.choices[0].text.trim();
          } else if (promptAugmentors.includes(choice)) {
            value = await pingGPT3(
              promptStack.concat(choice).join("/n"),
              options.openaiApiKey,
              {}
            );
            value = value.choices[0].text.trim();
          }
          return {
            name: choice === "$rewrite" ? rewriteMsg : choice,
            value: value,
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
        nextPrompt = values[0].value;
      } else {
        values.push({
          name: "accept current candidate without rewrite",
          value: nextPrompt,
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

        // console.log(table.toString());
        const value = await Select.prompt({
          message: "Pick a candidate you like to add onto the prompt stack.",
          options: values,
        });
        console.log(showNext(value));
        if (options.debug) console.log("log3", { value });
        nextPrompt = value;
      }
    }
  })
  // // Child command 1.
  // .command("clear", "Foo sub-command.")
  // .option("-f, --foo", "Foo option.")
  // // .arguments("<value:string>")
  // .action((options, ...args) => localStorage.clear())
  .parse(Deno.args);

async function pingGPT3(
  prompt: string,
  openaiApiKey: string,
  gpt3options: Object
) {
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
      temperature: 0.9,
      top_p: 1,
      n: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      // override defaults
      ...gpt3options,
    }),
  });
  return res.json();
}

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
