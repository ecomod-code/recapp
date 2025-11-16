
## What is Playwright?



Playwright is an open-source end-to-end framework made my Microsoft that provides a framework for testing software.
It allows the user to control one to many browser pages in real time at once. Interacting with the webpage, clicking
buttons, filling out forms, and waiting for results are all possible within this framework. The goal of Playwright is
to simulate one to multiple human users using the software/website simulaneously. 

Playwright is written in TypeScript/JavaScript and it runs inside Node.js. Tests can be written in .ts and/or .js files
and can be run in the terminal. Results from any performed tests are then stored and opened in an html file. 



## How to use PlayWright:



### Test files and configuration files
Playwright is already installed and configured within this GitHub repository. To run a test, a .ts/.js file must first be
created containing the contents of the test. A file called `example.spec.ts` has already been created and stored within
the `tests/e2e` path.

In addition to this, a configuration file named `playwright.config.ts` was created. It exists within the `tests/e2e`
path.


### Running a Playwright test locally
To run a test locally, the command `npx playwright test --headed` can be executed. Note that one must be in at least the `/tests`
directory (either in `/tests` or in `/tests/e2e`), in order to run a successful test. The tag `--headed` means that a physical
webpage will be opened during a test, so that the test operations can be watched as the process runs. The command defaults to a 
headless test, meaning no visual webpage appears on the screen during a test run, and everything is instead being run essentially
"behind the scenes".


### Viewing test reports
To view and open the test report from a previously executed test, there are multiple command variations that can be done, 
based on what directory the command is being executed from:

In the repository root, the command `npx playwright show-report tests/e2e/test-report` can be executed to view test reports. 
If the command is executed in the `/tests/ directory`, then the path in the command must be altered to correspond to the directory
location (`e2e/test-report` instead).

Within the `tests/e2e` directory, the command `npx playwright show-report test-report` can be executed to view test reports.

Note: it is likely easiest to run tests and view their reports within the `tests/e2e` directory.

