# JBC Online Editor

The editor is available at `/editor` locally and `/online-editor` when hosted on a Node server.

Set `EDITOR_PASSWORD` to protect both editor pages and `/api/*` write endpoints:

```sh
EDITOR_PASSWORD="choose-a-password" npm run editor
```

The editor saves content into `index.html` and visual overrides into `css/editor-overrides.css`. Use persistent server storage for production; temporary filesystems will lose edits after restart or redeploy.
