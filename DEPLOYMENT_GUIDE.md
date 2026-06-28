# Deployment Guide — Dokploy on VPS

## Prerequisites

1. **VPS** with Docker + Docker Compose installed (Ubuntu 22.04+ recommended, 2GB+ RAM)
2. **Dokploy** installed on the VPS ([docs.dokploy.com](https://docs.dokploy.com))
3. **Neon** PostgreSQL database ([neon.tech](https://neon.tech))
4. **Domain** pointed to your VPS IP (optional but recommended)

## Step 1: Push to GitHub

```bash
git add -A
git commit -m "production ready"
git push origin master
```

## Step 2: Set up Dokploy

1. SSH into your VPS and install Dokploy:
   ```bash
   curl -sSL https://dokploy.com/install.sh | sh
   ```

2. Open Dokploy dashboard at `http://your-vps-ip:3000`

3. Create a new **Compose** project and connect your GitHub repo.

4. Set the **Compose Path** to `docker-compose.yml` (root of repo).

## Step 3: Configure Environment Variables

In Dokploy's environment settings, add all variables from `.env.example`:

```
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=https://your-domain.com
DATABASE_URL=<from Neon>
DIRECT_URL=<from Neon>
OPENROUTER_API_KEY=<from openrouter.ai>
GEMINI_API_KEY=<from aistudio.google.com>
GEMINI_MODEL_FAST=gemini-2.5-flash
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
RESEND_API_KEY=<from resend.com>
RESEND_FROM_EMAIL=<your email>
TELEGRAM_BOT_TOKEN=<from @BotFather>
TELEGRAM_BOT_USERNAME=<bot username>
GROQ_API_KEY=<from console.groq.com>
SANDBOX_URL=http://sandbox:4000
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 4: Deploy

Click **Deploy** in Dokploy. It will:
1. Pull your repo
2. Build the Docker images (app + sandbox)
3. Start the containers
4. Run health checks

## Step 5: Set up Prisma

After first deploy, run the database migration:

```bash
# SSH into the web container via Dokploy terminal
npx prisma db push
```

## Step 6: Configure Domain (Optional)

In Dokploy:
1. Go to **Domains** tab
2. Add your domain (e.g., `app.calmant.ai`)
3. Dokploy auto-provisions SSL via Let's Encrypt

## Verify

- Visit `https://your-domain.com` — should show the landing page
- Sign up and complete onboarding
- Test the AI assistant
- Check `/dashboard/activity` for department activity logs

## Troubleshooting

| Issue | Fix |
|---|---|
| Build fails on Prisma | Make sure `DATABASE_URL` is set in env vars |
| Sandbox unreachable | Check sandbox container logs, ensure 2GB memory limit |
| OAuth redirect fails | Update `BETTER_AUTH_URL` to match your domain |
| Telegram not connecting | Verify bot token and set webhook URL |
