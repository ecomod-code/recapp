# Managing a Quiz <Badge type="tip" text="Teachers" />

## Quiz states

Every quiz is always in one of four states, shown in the top-right corner of the quiz view and on each card in the dashboard.

| State | Teachers can… | Students can… |
|---|---|---|
| <Badge type="warning" text="EDITING" /> (student questions on) | Add/edit questions, adjust settings, share, export, delete | Add and edit their own questions |
| <Badge type="warning" text="EDITING" /> (student questions off) | Curate questions, add questions, adjust settings, share, export, delete | View their own questions only |
| <Badge type="tip" text="STARTED" /> | View questions and live statistics | Answer questions; see results after finishing (if permitted) |
| <Badge type="danger" text="STOPPED" /> | View questions and statistics, export, delete/archive | View questions and statistics (if permitted) |

A newly created quiz starts in **Editing** mode. You control transitions using the Start quiz, Stop quiz, and curation controls.

::: tip Resetting statistics
Statistics reset automatically when a quiz is returned to editing mode. You can also reset them manually in stopped mode — see [Statistics](./statistics#resetting-statistics).
:::

## Adding questions

In the **Quiz questions** tab, click **+ New question**. A question window opens.

1. **Select a question type** — only types enabled in the quiz settings are available (free text, single choice, multiple choice).
2. **Write the question text** — the editor is markdown-based. Use the toolbar for formatting, or click **?** for syntax options.
3. **Add answer options** (choice questions only) — click **Add answer** for each option, then tick the correct answer(s). Use the arrows to reorder options.
4. **Add a hint** (optional) — a short note to help students interpret the question.
5. Click **Save question**.

To edit an existing question, click the **pencil icon** on its card.

::: info Markdown tips
**Images:** `![Alt text](https://url-to-image.jpg "optional title")`  
**Line break:** end a line with two spaces before pressing Enter.
:::

::: warning Simultaneous editing
Teachers and students can add questions at the same time. Editing the exact same question simultaneously may cause conflicts.
:::

## Curating a quiz

Curation mode lets you review and finalise student-submitted questions before starting the quiz. To enter it, click **Participant questions** in the Quiz questions tab — the button turns white to indicate curation mode is active.

In curation mode students can no longer add or edit questions. You can:

**Show or hide questions** — Click the eye icon on a question card to include or exclude it from the quiz. Use **Show all questions** / **Hide all questions** to change all at once. Hidden questions are excluded when the quiz starts. Questions must be hidden before they can be deleted.

**Reorder questions** — Use the up/down arrows to the left of each card. This order is used when "Shuffle questions" is off.

**Edit questions** — Click the pencil icon, make changes, click **Save question**.

**Delete questions** — Only hidden questions can be deleted. Shown questions are locked against deletion.

::: tip When is curation mode active?
If you disabled "Allow participants to set questions" in the settings, the quiz starts directly in curation mode — there's no editing phase for students.
:::

## Sharing a quiz

To invite students, share a **link** or **QR code**. Both are accessible via **Show QR code** in the Quiz questions tab, or via the share icon on the dashboard.

Students can join in two ways:
- **With a university login** — the quiz appears in their dashboard and they can return at any time.
- **Without logging in** — a temporary account is created. Participation is tied to the browser session.

Share the quiz in **editing mode** if you want students to submit questions first. Share it in **started mode** if you want them to answer questions straight away.

## Comments

Comments let teachers and students annotate individual questions (or the quiz as a whole). They're sorted by date and number of upvotes.

**Teachers can:**
- Post comments in any quiz mode
- Mark a comment as acknowledged (shown in green) or dismissed (shown in grey — dismissed comments are hidden from students)
- Delete any comment

**Students can:**
- Post comments only during the started phase, and only on the question currently on screen
- Upvote comments
- Delete their own comments

You can toggle the comment panel at any time using **Show/hide comments**. To hide comments from everyone permanently, enable **Hide comment list** in the quiz settings.

## Participant view

Click **Participant view** (top-right of the Quiz data or Quiz questions tab) to preview the quiz exactly as a student would see it, including the option to switch to the answering interface.

## Duplicating, exporting, archiving, and deleting

These actions are in the **Quiz data** tab, or via the trash icon on the dashboard for delete/archive.

| Action | What it does |
|---|---|
| **Duplicate** | Creates a copy in your dashboard. Useful for reusing a quiz each semester. |
| **Export** | Downloads a `.json` file with all settings and questions (no student names). Can be re-imported later. |
| **Archive** | Hides the quiz from your dashboard but keeps it accessible via its original link and QR code. Toggle **Show archived quizzes** on the dashboard to see archived quizzes. |
| **Delete** | Permanently removes the quiz. This cannot be undone. |
