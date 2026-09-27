"use server";

import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function runMyScript() {
  try {
    // Ensure your script has execution permissions (chmod +x)
    const { stdout, stderr } = await execPromise("ls -al");
    if (stderr) {
      console.error(`Script error: ${stderr}`);
    }
    return { success: true, output: stdout };
  } catch (error) {
    const errorMessage =
      typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : String(error);
    return { success: false, error: errorMessage };
  }
}
