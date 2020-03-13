###create-a-build-pipeline
[create-a-build-pipeline](https://docs.microsoft.com/nb-no/learn/modules/create-a-build-pipeline/3-build-locally)

Get the source code
Now you'll get the source code from GitHub and set up Visual Studio Code so that you can run the app and work with source code files.
Create a fork
The first step is to fork the Space Game web project so you can work with and modify the source files.
A fork is a copy of a GitHub repository. The copy exists in your account and enables you to make any changes you want without affecting the original project.
Although you can propose changes to the original project, here you'll work with the Space Game web project as though it were the original project owned by Mara and her team.
To fork the Space Game web project into your GitHub account:
In a web browser, go to GitHub  and sign in.
Go to the Space Game  web project.
Select Fork:

Follow the instructions to fork the repository into your account.
Clone your fork locally
You now have a copy of the Space Game web project in your GitHub account. Now you'll download, or clone, a copy to your computer so you can work with it.
A clone, just a like a fork, is a copy of a repository. When you clone a repository, you can make changes, verify they work as you expect, and then upload those changes back to GitHub. You can also synchronize your local copy with changes other authenticated users have made to GitHub's copy of your repository.
To clone the Space Game web project to your computer:
Go to your fork of the Space Game web project on GitHub.
Select Clone or download. Then select the button next to the URL that's shown to copy the URL to your clipboard:

In Visual Studio Code, go to the terminal window and run the git clone command. Replace the URL that's shown here with the contents of your clipboard:
bash

Kopier

git clone https://github.com/your-name/mslearn-tailspin-spacegame-web.git
Move to the mslearn-tailspin-spacegame-web directory. This is the root directory of your repository.
bash

Kopier

cd mslearn-tailspin-spacegame-web
Set the upstream remote
A remote is a Git repository where team members collaborate (like a repository on GitHub).
Run this git remote command to list your remotes:
bash

Kopier

git remote -v
You see that you have both fetch (download) and push (upload) access to your repository:
output


C:\Users\john.hansen\source\repos\github\AzureDevops\mslearn-tailspin-spacegame-web>git remote -v
origin  https://github.com/johnhansenbouvet/mslearn-tailspin-spacegame-web.git (fetch)
origin  https://github.com/johnhansenbouvet/mslearn-tailspin-spacegame-web.git (push)

Kopier

origin  https://github.com/username/mslearn-tailspin-spacegame-web.git (fetch)
origin  https://github.com/username/mslearn-tailspin-spacegame-web.git (push)
Origin specifies your repository on GitHub. When you fork code from another repository, it's common to name the original remote (the one you forked from) as upstream.
Run this git remote add command to create a remote named upstream that points to the Microsoft repository:
bash

Kopier

git remote add upstream https://github.com/MicrosoftDocs/mslearn-tailspin-spacegame-web.git
Run git remote a second time to see the changes:
bash

Kopier

git remote -v
You see that you still have both fetch (download) and push (upload) access to your repository. You also now have fetch access from the Microsoft repository:
output

Kopier

origin  https://github.com/username/mslearn-tailspin-spacegame-web.git (fetch)
origin  https://github.com/username/mslearn-tailspin-spacegame-web.git (push)
upstream        https://github.com/MicrosoftDocs/mslearn-tailspin-spacegame-web.git (fetch)
Open the project in the file explorer
In Visual Studio Code, your terminal window points to the root directory of the Space Game web project. You'll now open the project from the file explorer so you can view its structure and work with files.
On the File menu, select Open or Open Folder.
Navigate to the root directory of the Space Game web project.
(You can run the pwd command in the terminal window to see the full path if you need a reminder.)
You see the directory and file tree in the file explorer.
 Obs!
You might need to open the integrated terminal a second time after you open the folder.
Build and run the web application
Now that you have the web application, you can build and run it locally.
In Visual Studio Code, navigate to the terminal window and run this dotnet build command to build the application:
bash

Kopier

dotnet build --configuration Release
 Obs!
If the dotnet command is not found, review the prerequisites at the start of this module. You may need to install .NET Core.
.NET Core projects typically come with two build configurations: Debug and Release. Debug builds aren't optimized for performance. They make it easier for you to trace through your program and troubleshoot issues. Here we choose the Release configuration just to see the web app in action.
You'll likely see a few build warnings in the output. These warnings are included intentionally. You can ignore them for now.
From the terminal window, run this dotnet run command to run the application:
bash

Kopier

dotnet run --configuration Release --no-build --project Tailspin.SpaceGame.Web

.NET Core solution files can contain more than one project. The --project argument specifies the project for the Space Game web application.
Verify the application is running
In development mode, the Space Game web site is configured to run on port 5000.
From a new browser tab, navigate to http://localhost:5000 to see the running application.
You see this:

## implement-code-workflow

[implement-code-workflow](https://docs.microsoft.com/nb-no/learn/modules/implement-code-workflow/4-create-pull-request)

Push your branch to GitHub
Here, you push your code-workflow branch to GitHub and watch Azure Pipelines build the application.
In the terminal, run git status to see what uncommitted work exists on your branch:
bash

Kopier

git status
You see that azure-piplines.yml has been modified. You'll commit that to your branch shortly, but you first need to make sure that Git is tracking this file. This is called staging the file.
Only staged changes are committed when you run git commit. Next, you run the git add command to add azure-pipelines.yml to the staging area, or index.
Run the following git add command to add azure-piplines.yml to the staging area:
bash

Kopier
```
git add azure-pipelines.yml
```
Run the following git commit command to commit your staged file to the code-workflow branch.
bash

Kopier
```
git commit -m "Add the build configuration"
```
The -m argument specifies the commit message. The commit message becomes part of a changed file's history. It helps reviewers understand the change as well as help future maintainers understand how the file changed over time.
 Tips!
The best commit messages complete the sentence, "If you apply this commit, you will ..."
If you omit the -m argument, Git brings up a text editor where you can detail the change. This option is useful when you want to specify a commit message that spans multiple lines. The text up to the first blank line specifies the commit title.
Run this git push command to push, or upload, the code-workflow branch to your repository on GitHub.
bash

Kopier
```
git push origin code-workflow
```
As an optional step, go to your project in Azure Pipelines and trace the build as it runs.
This build is called a CI build. Your pipeline configuration uses what's called a trigger to control which branches participate in the build process. Here, "*" specifies all branches.
yml

Kopier

trigger:
- '*'
Later, you'll see how to control your pipeline configuration to build from only the branches that you need.
You see that the build completes successfully and produces an artifact that contains the built web application.