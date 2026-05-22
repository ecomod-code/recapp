# Creating a Quiz <Badge type="tip" text="Teachers" />

## Create a new quiz

On the dashboard, click **+ New quiz** in the top right. A settings page opens where you can configure the quiz. At minimum, give it a **title** — all other settings have sensible defaults and can be changed at any time while the quiz is in editing mode.

Click **Create quiz** to confirm. You'll be taken directly to the new quiz's **Quiz questions** tab, ready to add questions or share the quiz with students.

## Import an existing quiz

If you've previously exported a quiz (see [Exporting results](./run-quiz#exporting-results)), you can import it as a new quiz. Click **Import quiz** on the dashboard, select the `.json` file, and click **Import**.

All settings and questions are imported. The importing teacher's name appears as the author on all imported questions, regardless of who originally wrote them.

## Quiz settings

Quiz settings live in the **Quiz data** tab and can be adjusted any time the quiz is in editing or curation mode. Students can only see the title and description — everything else is teacher-only.

### Basic information

**Title** (required)  
Shown on the dashboard and visible to students in the Quiz data tab. Up to 150 characters.

**Description** (optional)  
Additional context about the quiz. Also visible to students.

### Teachers

The teachers field lists everyone with teacher-level access. To add a co-teacher or tutor, click **Share** next to the teachers field, search by email address or name, and click **Share with confirmed users**.

::: warning Adding teachers
You can only add people who have already logged into Recapp at least once. If someone hasn't logged in yet, send them the quiz link first and add them after their first login.
:::

### Student permissions

| Setting | Default | What it controls |
|---|---|---|
| Allow participant comments | **On** | Students can post comments on questions during the quiz |
| Allow participants to set questions | **On** | Students can add and edit questions in editing mode |
| Participants can view statistics | **Off** | Students can see results after completing the quiz |
| Hide comment list | **Off** | When on, comments are hidden from everyone |

### Participation options

Controls what name students can use when submitting questions and comments. All three are enabled by default, letting students choose. Disable any option to remove it from their choices.

- **Anonymous** — no name is shown
- **Pseudonym** — the name set in their account settings
- **Real name** — their university account name

Teachers always participate under their real name.

### Question types

Controls which question formats are available. All three are enabled by default.

| Type | Description |
|---|---|
| **Free text** | Students write a text answer; not automatically graded |
| **Single choice** | One correct answer among several options |
| **Multiple choice** | Multiple answers can be correct |

### Shuffling

| Setting | Default | Effect |
|---|---|---|
| Shuffle questions in quiz mode | **On** | Each student gets questions in a different random order |
| Shuffle answers | **Off** | When on, answer options appear in random order per student |

If shuffling is off, questions appear in the order set in the Quiz questions tab. See [Curating a quiz](./manage-quiz#curating-a-quiz) for how to set that order.
