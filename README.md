# Chat + Tasks (Frontend)

The participant-facing part of our study application. The server code can be found [here](https://github.com/aaltoengpsy/chat-tasks-backend).

- [Overview](#overview)
- [Setting Up](#setting-up)
    - [Running the Application Locally](#running-the-application-locally)
    - [Deploying Online](#deploying-online)
    - [Environment Variables](#environment-variables)
- [Updating the Survey Items](#updating-the-survey-items)
- [Architecture](#architecture)
    - [Interface Components](#interface-components)
        - [Styling](#styling)
    - [Assistive Scripts](#assistive-scripts)
    - [What's up with `taskIndex` & `sourceIndex`?](#whats-up-with-taskindex-and-sourceindex)

## Overview

The frontend features a side-by-side view, with questionnaires and instructions shown on the left half of the screen (task view) with ChatGPT on the right (chat view).

The application is built with [React](https://react.dev/) on top of [Vite](https://vitejs.dev/). The UI elements are a mix of [NextUI](https://nextui.org/) components and custom ones styled with [TailwindCSS](https://tailwindcss.com/). All icons are from [Bootstrap icons](https://icons.getbootstrap.com/). React's [reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) and [context](https://react.dev/learn/passing-data-deeply-with-context) functionalities are used to manage parts of the application state to reduce prop drilling. Form elements in questionnaires are handled and validated with [React Hook Form](https://react-hook-form.com/). Finally, [a custom parsing solution](https://github.com/aaltoengpsy/taskParser.js) is used to parse the contents of the task view from (sort of) human-readable text files.

## Setting Up

### Running the Application Locally

You should have [Node](https://nodejs.org/en) installed. [Node Version Manager](https://github.com/nvm-sh/nvm) is a good way to get started if you're on Linux or macOS ([even the official Node site recommends it](https://nodejs.org/en/download/package-manager)).

1. Clone or download this repository

2. Navigate to the root of the repository

3. Install dependencies

```bash
$ npm install
```

4. Install the [`taskParser`](https://github.com/aaltoengpsy/taskParser.js) submodule

```bash
$ git submodule init
```

```bash
$ git submodule update
```

5. Create an `.env` file and specify the environment variables (more on these [below](#environment-variables))

6. Run the development server
```bash
$ npm run dev
```

7. Navigate to `http://localhost:5173` in your browser of choice

### Deploying Online

You should be able to deploy the application directly to e.g. Netlify as it is essentially a static site. Connect your GitHub account, then select this repository. Remember to set the [environment variables](#environment-variables)! 

You can also run the `build` command specified in `package.json`:

```bash
$ npm run build
```

This produces a static site in a directory titled `dist/` in the project root. You can then use any web server to serve the contents of the directory with `index.html` as the entry point.

> **N.B.** If you use the build command, the environment variables specified in your local `.env` file will be used, even if you decide to host the built site on Netlify, which allows for the setting of environment variables through its interface. This is because environment variables are applied during build. In other words, if you deploy directly from GitHub, Netlify builds the application using the environment specified on their plaftorm. If you deploy a locally built version, the environment specified locally is applied.

### Environment Variables

- `VITE_PROXY_URL` is the URL your chat / database proxy server is running at **WITHOUT THE TRAILING SLASH**. If you are running [the server]() locally, this will be `http://127.0.0.1:5000`. Note that for live deployments you will probably not need to specify the port.

- `VITE_CHAT_ENABLED_BEGIN` defines the *first task page during which* the chat will be *enabled*. Will default to `1` if undefined. You can change this to 0 so that the chat will immediately activate after entering an ID. Realistically you'd want to introduce your participants to the task first anyway!

- `VITE_CHAT_ENABLED_END` defines the *last task page during which* the chat will be *disabled*. Will default to `99` if undefined.

> Note that both `VITE_CHAT_ENABLED_BEGIN` and `VITE_CHAT_ENABLED_END` are zero-index, i.e. if you want to enable chat during the second page in your task file, you should set the former to `1`.

- `VITE_ALLOW_IMAGES` should be set to `true` or `false` depending on whether you want to enable image attachments to the chat feature. Will default to `true` if undefined.

- `VITE_PCTP_CONDITION` should be set to correspond to the condition that participants will receive the study in. Currently the available options are `ai` and `no-ai`, but you can change these in [`main.jsx`](./src/main.jsx).

- `VITE_ATTN_CHECK_PAGE` and `VITE_ATTN_CHECK_RES` should contain the task index of your attention check and the correct answer(s). If your attention check has multiple answers, separate them by a comma. See `src/components/tasks/questions/taskpage` for how this is handled. If you don't want to force a successful attention check, you can just change this to a negative number.

- `VITE_DEV_MODE` can be set to `true` to be able to move through the survey a bit quicker. This disables the ID and chat interaction requirements, but not the requirement of having to respond to all survey items.

VITE_PROXY_URL= http://127.0.0.1:5000

VITE_CHAT_ENABLED_BEGIN= 1 # first enabled chat page

VITE_CHAT_ENABLED_END= 99

VITE_ALLOW_IMAGES= false

VITE_PCTP_CONDITION= ai

VITE_ATTN_CHECK_PAGE= 1

VITE_ATTN_CHECK_RES = Logical reasoning,The best choice

VITE_DEV_MODE= true # for testing, change to false

## Updating the Survey Items

The survey items (instructions, questions), can be found in the `public/` directory. As our study contains two conditions that require different survey contents, we have two separate survey files (`ai_tasks.md` and `no-ai_tasks.md`). Additionally, since our study's information document also varies slightly between conditions, we also have two separate information/consent documents, though for these only examples are included (`ai_studyinfo_example.md` and `no-ai_studyinfo_example.md`) as they usually contain study-specific information.

The surveys are formatted according to the [taskParser](https://github.com/aaltoengpsy/taskParser.js) spec. No programming knowledge is required for just updating the survey contents.

Remember to update the [environment variables](#environment-variables) accordingly, if you would like to have the chat enabled/disabled starting from a certain page! Also remember to update the attention check variables in `.env`!

In theory there's no limit to how many conditions you can run (simply edit the condition checker in `src/main.jsx` accordingly), though, with the current system where conditions are predefined, you might have to either run separate deployments for each condition or run conditions sequentially, updating the software in between.

## Architecture

The application is built with React. You will find the source code in the `src/` directory. Here, `main.jsx` acts as the project root. 

### Interface components

...are placed in `src/components/` and further divided to `chat` and `tasks` based on whether they concern the chat view or the task view.

Some of the more notable components: 

- `src/components/chat/ChatView.jsx` contains the logic for requesting chat completions and rendering incoming messages. Note that since our server implements a queuing system, sending a message should return a job id, which is then used to periodically check (currently, every 4 seconds) whether the request has been fulfilled.
- `src/components/chat/ImageSelector.jsx` contains the logic for uploading images (incl. compressing them to `512px * 512px` or `1MB`) *Note that this needs to be enabled in the `.env`.*
- `src/components/tasks/DonePage.jsx`, when rendered, attempts to save the participant data to the database and, if failed, offers a button to re-try. If the save is successful, some final content is shown. Update this to redirect participants at the end of the study.
- `src/components/tasks/questions/QuestionWrapper.jsx` defines the acceptable question types and renders an appropriate question component accordingly. Type-specific validation requirements are also defined here!
- `src/components/tasks/questions/OptionQuestion.jsx` offers a multiple-choice question component with an optional open ('Other, please specify') field.

#### Styling

As mentioned, the interface is styled using a mix of [NextUI](https://nextui.org/) components and custom [tailwindcss](https://tailwindcss.com/docs) styling. This made prototyping the UI notably faster, with the ready-made components being able to be extended if needed and tailwindcss easily integrating to the .jsx used by React. Unfortunately, while the latter definitely increases development speed, it also makes the code quite a bit less readable at times. Sorry! 😅

### Assistive scripts

...can be found in `src/scripts/`. These include the `taskParser` submodule, `chatService.js`, which handles requesting GPT responses from the proxy API and `dbService.js`, which is used to request the proxy API to perform database operations.

> The database and chat service scripts are written so that it should be fairly straightforward to adapt them to work with any custom proxy system, if you don't want to use ours. Essentially, all they do is pass information to the proxy, which then handles extracting the relevant information and building further API calls.

The application state is maintained by `src/scripts/store.jsx`. It uses React's reducer functionality to offer functions for proceeding forward in the survey, enabling and disabling the chat functionality as well as to maintain records of the participant's ID, experimental condition, chat message history and survey responses.

> Note that the store solution is quite bloated as-is. As the application grew, more requirements for handling the application state emerged (e.g. chat "onboarding", tracking whether chat has been used). Therefore, it would have been smarter to use two separate stores for participant data (id, messages & survey responses) and application state.

### What's up with `taskIndex` and `sourceIndex`?

[`taskParser`](https://github.com/aaltoengpsy/taskParser.js) offers the option to randomize the order of stretches of pages within a survey. For example, if you take a look at `public/ai_tasks.md`, you will see that the pages constituting the LSAT questionnaire have their order randomized. This means that every time that `loadTasks()` is called (which in our case is once on application load as it is called in `src/main.jsx`), the order of certain pages is random.

For logging, this poses a challenge as we no longer can simply log the ordinal number of a page `taskIndex` alongside questionnaire responses -- this would mean that if participant `A` gets questions in order `[1, 2]` and participant `B` in `[2, 1]`, their responses would be in a different order and could get mixed up without knowledge of the order in which they got the questions.

This is why `taskParser` retains the original order of the pages (as defined in the task source file) in the `sourceIndex` field. This way we can map questionnaire responses to each page's `sourceIndex` (look at `src/components/tasks/questions/TaskPage.jsx` and `src/scripts/store.jsx` for specifics) and be sure that the resposes we log are associated with the same page every time, no matter the order in which the pages are presented.

In short, `taskIndex` is used to keep track of survey progress in application flow, while `sourceIndex` is used in logging to connect survey responses to their respective pages.
