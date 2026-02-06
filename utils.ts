import env = Deno.env;

const FALSE_VALUES = ["0", "false", "no", "off"];
const nevermindKey = "LOG_LITERALLY_EVERYTHING";
// in case we want to for some ungodly reason toggle this at runtime
// deno-lint-ignore prefer-const
export let bypassCheck = internalCheck(nevermindKey);

function internalCheck(key: string): boolean {
  const value = env.get(`GDCHAT_${key}`);
  if (!value) return false;

  return !FALSE_VALUES.includes(value.trim().toLowerCase());
}

export function conditionalLog(key: string, ...toLog: unknown[]): boolean {
  if (bypassCheck || internalCheck(key)) {
    console.debug(...toLog);
    return true;
  }
  return false;
}
