[![Build Status](https://dev.azure.com/Midietec-DevOps/Tailspin-Space%20Game/_apis/build/status/build-pipelines/Soy-Mico.mslearn-tailspin-spacegame-web?branchName=main)](https://dev.azure.com/Midietec-DevOps/Tailspin-Space%20Game/_build/latest?definitionId=44&branchName=main)

# Run code coverage locally
## 1) Run the following dotnet new command to create a local tool manifest file.
    *dotnet new tool-manifest*
    The command creates a file named .config/dotnet-tools.json.

## 2)Run the following dotnet tool install command to install ReportGenerator:
    *dotnet tool install dotnet-reportgenerator-globaltool*
    This command installs the latest version of ReportGenerator and adds an entry to the tool manifest file.

## 3) Run the following dotnet add package command to add the coverlet.msbuild package to the Tailspin.SpaceGame.Web.Tests project:
    *dotnet add Tailspin.SpaceGame.Web.Tests package coverlet.msbuild*

## 4) Run the following dotnet test command to run your unit tests and collect code coverage:
    Note
    If you are using the PowerShell terminal in Visual Studio, the line continuation character is a backtick (`). So, use that character in place of the backslash character (\) for multi-line commands.

    *dotnet test --no-build \
    --configuration Release \
    /p:CollectCoverage=true \
    /p:CoverletOutputFormat=cobertura \
    /p:CoverletOutput=./TestResults/Coverage/*

    If the command fails, try running it as follows:
    *MSYS2_ARG_CONV_EXCL="*" dotnet test --no-build \
    --configuration Release \
    /p:CollectCoverage=true \
    /p:CoverletOutputFormat=cobertura \
    /p:CoverletOutput=./TestResults/Coverage/*
    This command resembles the one you ran previously. The /p: flags tell coverlet which code coverage format to use and where to place the results.

## 5) Run the following dotnet tool run command to use ReportGenerator to convert the Cobertura file to HTML:
    *dotnet tool run reportgenerator \
    -reports:./Tailspin.SpaceGame.Web.Tests/TestResults/Coverage/coverage.cobertura.xml \
    -targetdir:./CodeCoverage \
    -reporttypes:HtmlInline_AzurePipelines*
    Many HTML files will appear in the CodeCoverage folder at the root of the project.

## 6) In Visual Studio Code, expand the CodeCoverage folder, right-click index.htm, and then select Reveal in Explorer


