import * as fs from "fs"
import * as path from "path"
import { app } from "electron"
import { z } from "zod"

const HasVersionSchema = z.object({
  version: z.string(),
})

export default function getApplicationVersion(): string {
  const readFileOptions = {
    encoding: "utf-8" as const,
    flag: "r" as const,
  }
  const packageJsonFile = fs.readFileSync(
    path.join(app.getAppPath(), "package.json"),
    readFileOptions,
  )
  const packageJson = HasVersionSchema.parse(JSON.parse(packageJsonFile))
  return packageJson.version
}
