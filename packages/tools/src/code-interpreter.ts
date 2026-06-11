export const CodeInterpreterSchema = {
  name: "code_interpreter",
  description: "Executes client JavaScript code inside a lightweight virtual sandbox. Great for math, string manipulations, and array mutations.",
  parameters: {
    type: "OBJECT",
    properties: {
      code: {
        type: "STRING",
        description: "The complete clean JavaScript code block to run. Always run within wrapper, must return result."
      }
    },
    required: ["code"]
  }
};

export async function executeCodeInterpreter(code: string): Promise<string> {
  try {
    const sandboxFn = new Function("console", `
      let logs = [];
      const mockConsole = {
        log: (...args) => { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ")); }
      };
      const execute = () => {
        ${code}
      };
      const evaluate = execute();
      return { logs, result: evaluate };
    `);

    const run = sandboxFn({ log: () => {} });
    return JSON.stringify({
      success: true,
      logs: run.logs,
      result: run.result ?? "Executed safely but returned undefined code."
    }, null, 2);
  } catch (err: any) {
    return JSON.stringify({
      success: false,
      errorCode: err.message
    }, null, 2);
  }
}
