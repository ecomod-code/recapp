
## What is Playwright?



Playwright is an open-source end-to-end framework made my Microsoft that provides a framework for testing software.
It allows the user to control one to many browser pages in real time at once. Interacting with the webpage, clicking
buttons, filling out forms, and waiting for results are all possible within this framework. The goal of Playwright is
to simulate one to multiple human users using the software/website simulaneously. 

Playwright is written in TypeScript/JavaScript and it runs inside Node.js. Tests can be written in .ts and/or .js files
and can be run in the terminal. Results from any performed tests are then stored and opened in an html file. 



## How to use PlayWright:
*Note: The user must be within the `tests/e2e` directory in order to correctly run all associated playwright functions. This
is due to directory configuration settings.*


### Test files and configuration files
Playwright is already installed and configured within this GitHub repository. To run a test, a .ts/.js file must first be
created containing the contents of the test. A file called `example.spec.ts` has already been created and stored within
the `tests/e2e` path.

In addition to this, a configuration file named `playwright.config.ts` was created. It exists within the `tests/e2e`
path.


### Creating test files
Test files contain the contents and actions that will be executed during the test, and are stored in a .ts/js file. These 
.ts/.js can be programmed manually, however the `codegen` command within playwright is a simplified method of attaining the 
sought out actions programmed in test file. 

The `codegen` command records the testing-executing user's manual test actions (locations of clicks, text inputs, etc.), and 
automatically programs the actions into a test file format. The contents of the generated test file can then be used for 
repeatable playwright tests. 

The following code demonstrates the use of the codegen command: `npx playwright codegen [insert link to webpage]`. The link
to the webpage should not be quoted.

When this command is executed, both the webpage and the programming page will open. Actions done within the webpage are then
added to the programming page. Once the desired actions of a test are completed, the contents of the programming page can be 
copied and pasted into a new test file (test-name.spec.ts). 


### Running a Playwright test locally
To run a test locally, the command `npx playwright test --headed` can be executed.  The tag `--headed` means that a physical 
webpage will be opened during a test, so that the test operations can be viewed as the process runs. The command defaults to
a headless test, meaning no visual webpage appears on the screen during a test run, and everything is instead being run 
essentially "behind the scenes".

To ensure a trace file is generated upon test execution, the tag `--trace on` can be added to the playwright test command. The 
trace file will then be generated within `tests/e2e/test-artifacts` within the directory of the respective test. 


### Viewing test reports
The simplest and most uniform way to view playwright test reports is done using the command `npx playwright show-report test-report`. 
Once again, this command must be run within the `tests/e2e` directory, like all other playwright commands.

If desired, the user can view tests from the repository root with the command `npx playwright show-report tests/e2e/test-report`. 

Additionally, if the command is executed in the `/tests` directory, the file path in the command must be altered to correspond to the 
directory location (`e2e/test-report` instead). 

### Viewing trace files
To view trace files from previously executed tests, the following command can be executed: `npx playwright show-trace [filepath]`.
The trace files are located within `test-artifacts/[test name]/trace.zip`. The test name may vary slightly from the name of the 
respective .ts file. In order to correctly open the trace file, `trace.zip` must be included in the file path of the trace files.  

Once the `show-trace` command is executed, a new window will open, showing the user the contents of the tracefile. 






