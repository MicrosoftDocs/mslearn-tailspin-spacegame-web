# Azure DevOps Pipeline PowerShell Script

# Restarts/starts/stops a service. Service actions may be priviliged. Permissions may need to be adjusted for non-admin users.

# ServiceName is a mandatory parameter, as is ServiceAction. ServiceAction can be Restart, Start, Stop

Param (
    [Parameter(Mandatory)]
    [string] $ServiceName,

    [Parameter(Mandatory)]
    [ValidateSet("Start","Stop","Restart")]
    [string] $ServiceAction
)

Function TestServiceRunningAfterAction {

    $Service = Get-Service -ServiceName $ServiceName
    if ($Service.Status -ne "Running") {
        Write-Error "Service '$ServiceName' not running after attempted $ServiceAction."
    }
    else {
        Write-Host "Service started successfully"
    }
}

Function TestServiceStoppedAfterAction {

    $Service = Get-Service -ServiceName $ServiceName
    if ($Service.Status -ne "Stopped") {
        Write-Error "Service '$ServiceName' still running after attempted stop."
    }
    else {
        Write-Host "Service stopped successfully"
    }
}

Function WriteActionErrorExit {
    Param ([string] $ErrorText)

    Write-Error "An occurred while attempting to perform action '$ServiceAction' on service '$ServiceName'`n$ErrorText"
}
    
# Main

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if (-not ($Service)) {
    Write-Error "Service does not exist, or an error occurred while retrieving service"
}

Write-Host "Attempting to perform action '$ServiceAction' on service '$ServiceName'"

switch ($ServiceAction) {

    'Restart' {
        try {
            Restart-Service -name "$ServiceName" -ErrorAction Stop
        }
        catch {
            WriteActionErrorExit -ErrorText "$Error[0]"
        }

        TestServiceRunningAfterAction
    }

    'Start' {
        try {
            Start-Service -name "$ServiceName" -ErrorAction Stop
        }
        catch {
            WriteActionErrorExit -ErrorText "$Error[0]"
        }

        TestServiceRunningAfterAction
    }

    'Stop' {
        try {
            Stop-Service -name $ServiceName -ErrorAction Stop
        }
        catch {
            WriteActionErrorExit -ErrorText "$Error[0]"
        }

        TestServiceStoppedAfterAction
    }
}

        
