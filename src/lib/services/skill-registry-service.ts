import { prisma } from "../prisma";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export class SkillRegistryService {
  /**
   * Seeds skills from the docs/skills directory into the database.
   */
  static async seed(): Promise<void> {
    console.log("[SkillRegistryService] Seeding skills...");
    const skillsDir = path.resolve(process.cwd(), "../docs/skills");
    
    if (!fs.existsSync(skillsDir)) {
      console.warn(`[SkillRegistryService] Skills directory not found: ${skillsDir}`);
      return;
    }

    const files = fs.readdirSync(skillsDir).filter(f => f.endsWith(".md") && f !== "00-skill-index.md");

    let count = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(skillsDir, file), "utf8");
      
      // Parse markdown to get a basic name, description, and instructions
      // A simple heuristic: first line starting with # is the name, rest is instructions.
      const lines = content.split('\n');
      const nameLine = lines.find(l => l.startsWith('# ')) || `# ${file.replace('.md', '')}`;
      const name = nameLine.replace('# ', '').trim();
      
      const descriptionLine = lines.find(l => l.length > 20 && !l.startsWith('#')) || "Default description";
      const description = descriptionLine.trim();

      const versionHash = crypto.createHash("md5").update(content).digest("hex");

      const existingSkill = await prisma.skill.findUnique({
        where: { name }
      });

      if (!existingSkill) {
        await prisma.skill.create({
          data: {
            name,
            description,
            instructions: content,
            versionHash,
          }
        });
        console.log(`[SkillRegistryService] Created skill: ${name}`);
        count++;
      } else if (existingSkill.versionHash !== versionHash) {
        await prisma.skill.update({
          where: { name },
          data: {
            description,
            instructions: content,
            versionHash,
          }
        });
        console.log(`[SkillRegistryService] Updated skill: ${name}`);
        count++;
      }
    }
    
    console.log(`[SkillRegistryService] Seeding complete. Processed ${count} new/updated skills.`);
  }

  static async getActiveSkills() {
    return prisma.skill.findMany({
      where: { enabled: true }
    });
  }
}
