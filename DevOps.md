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