# iBlueText: Send iMessage, SMS & WhatsApp

Text a phone from any GitHub workflow. Deploy finished, build broke, release shipped: get it as a **blue iMessage** on an iPhone, an **SMS** on anything else, or a **WhatsApp** message, sent from your own [iBlueText](https://ibluetext.com) number.

- Blue iMessage to iPhones, SMS to everyone else, picked automatically
- WhatsApp from your own number
- Attach a photo, PDF or file by URL
- Optionally wait until the message has actually gone out
- No dependencies, runs on Linux, macOS and Windows runners

## Setup

1. Sign up free at [ibluetext.com](https://ibluetext.com/portal/signup.php) (no card, free messages to start).
2. In the portal, open **Integrations** and create an API key.
3. In your repo: **Settings → Secrets and variables → Actions → New repository secret**, name it `IBLUETEXT_API_KEY`.

## Usage

```yaml
- name: Text me when the deploy is done
  uses: iBlueText/send-text-action@v1
  with:
    api-key: ${{ secrets.IBLUETEXT_API_KEY }}
    to: '+18135550142'
    message: '✅ ${{ github.repository }} deployed (${{ github.sha }})'
```

Only on failure, to two people:

```yaml
- name: Text the team if the build breaks
  if: failure()
  uses: iBlueText/send-text-action@v1
  with:
    api-key: ${{ secrets.IBLUETEXT_API_KEY }}
    to: '+18135550142, +17275550199'
    message: '❌ ${{ github.workflow }} failed on ${{ github.ref_name }}: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}'
    fail-on-error: 'false'
```

WhatsApp, with a file, waiting until it has been sent:

```yaml
- uses: iBlueText/send-text-action@v1
  with:
    api-key: ${{ secrets.IBLUETEXT_API_KEY }}
    to: '+447700900123'
    channel: whatsapp
    message: 'Release notes for ${{ github.ref_name }}'
    media-url: 'https://example.com/release-notes.pdf'
    wait: '60'
```

## Inputs

| Input | Required | Default | What it does |
|---|---|---|---|
| `api-key` | yes | | Your iBlueText API key. Always pass it from a secret. |
| `to` | yes | | Phone number(s) with country code. Separate several with commas or new lines. |
| `message` | yes | | The text to send. |
| `channel` | no | `auto` | `auto` (iMessage to iPhones, SMS to others), `imessage`, `sms` or `whatsapp`. |
| `media-url` | no | | `https://` link to a photo, video, PDF or other file to attach. |
| `line-id` | no | | Which of your sending lines to use (iMessage/SMS). Default: your active line. |
| `wait` | no | `0` | Seconds to wait for each message to be sent (max 300). `0` = queue it and move on. |
| `fail-on-error` | no | `true` | Fail the step if a message can't be sent. Use `false` for best-effort alerts. |

## Outputs

| Output | What it is |
|---|---|
| `message-ids` | iBlueText message IDs, comma-separated, in the same order as `to`. |
| `status` | `queued`, `sent`, `delivered`, `failed` or `partial`. |

## Notes

- Your API key is only ever sent to `https://ibluetext.com/api/v1` and is masked in the logs.
- People who reply STOP are opted out automatically and won't be texted again.
- Pricing, free tier and line limits: [ibluetext.com/pricing.php](https://ibluetext.com/pricing.php). API docs: [ibluetext.com/docs](https://ibluetext.com/docs/).
- Also from iBlueText: an [MCP server](https://github.com/iBlueText/ibluetext-mcp) for Claude, ChatGPT and other AI assistants.

## License

MIT © RG Loomis LLC
