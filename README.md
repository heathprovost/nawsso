nawsso
=======

Node AWS SSO Credentials Helper - sync up AWS CLI v2 SSO login session to legacy CLI v1 credentials.

## Prerequisite

- Required `Node >= 14`
- Required [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- Assume you have already setup [AWS SSO](https://aws.amazon.com/single-sign-on/) for your organization

## Basic Usage

- Install using npm:
```commandline
$ npm install -g @heathprovost/nawsso
```

- If you only have one AWS SSO setup you can sync all configured profiles without providing any parameters:
```commandline
$ nawsso
Synchronized credentials for 5 profile(s)
```

- To sync all credentials for the specified starturl (only required when you have multiple SSO setups):
```commandline
$ nawsso --starturl https://myendpoint.awsapps.com/start
Synchronized credentials for 3 profile(s)
```

- To sync only a single profile:
```commandline
$ nawsso --profile myprofile
Synchronized credentials for profile 'myprofile'
```

- To force a new login session, even when the existing session is still valid
```commandline
$ nawsso --force
Attempting to automatically open the SSO authorization page in your default browser.
If the browser does not open or you wish to use a different device to authorize this request, open 
the following URL:

https://device.sso.us-east-2.amazonaws.com/

Then enter the code:

NSKQ-XJWP
Successully logged into Start URL: https://myendpoint.awsapps.com/start#/
Synchronized credentials for 5 profile(s)
```

## Windows Subsystem for Linux (WSL2)

Generally Nawsso will work fine in WSL2 as long as you always do one of the following:

1. Always install both Nawsso and AWS-CLI in both windows **and** WSL2. If you also use something like nvm in either
   environment then you should install Nawsso globally in **all** of your node versions. You can optionally 
   [symlink your .aws folder](#sharing-profiles-and-credentials) if you want logins to presist across environments.  
2. Install Nawsso and AWS-CLI in windows **only** and either [symlink your .aws folder](#sharing-profiles-and-credentials) **or**
   always using the `--winhome` flag when running in WSL2. While it will run slightly slower due to WSL2 file access being
   slow across platform boundaries, it should work reliably.

### Sharing Profiles and Credentials 

By default the Windows and WSL2 environments are treated independently and thus logging into a profile in one has no effect
on the other. You can optionally bind the two environments together by creating a symlink in your WSL2 home directory to
the `.aws` folder in your Windows home directory. In fact some tools, such as 
[Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) will do this **automatically** when they are installed.
When this symlink exists running Nawsso in either environment will update your session in both of them.

### Why?

Nawsso should work on Windows, Linux, and MacOS out of box with no special requirements. However, users who use the 
[Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/install) (WSL2) on Windows Platforms may
occasionally require special handling because of the cross-platform capabilities that WSL2 provides. 

It is possible to run the windows version of Nawsso from the WSL environment since WSL searchs your windows path for 
executables and will run it unless it is **also** installed on Node in WSL2. This can get particulary complicated if 
the AWS CLI is not installed on the same platform as Nawsso, it can actully end up launching the AWS CLI installed by
the *other environment*. Things can get **even more** convoluted if you also use node version managers like 
[nvm](https://github.com/nvm-sh/nvm) or [nvm for windows](https://github.com/coreybutler/nvm-windows) because behavior
may depend on which version of node is active in each environment at any given time...

Regardless, when run on windows the user's `.aws` directory (usually `C:\Users\username\.aws`) is where your profiles and 
credentials are stored and where Nawsso expects to find them. When run in WSL2 this path is usually `/home/username/.aws`.
Which path should be used depends on which AWS-CLI gets run. By default Nawsso will **always** run the AWS-CLI installed
in WSL2 and thus will use the WSL2 paths to find profiles and credentials. 

The special `--winhome` flag overrides this default behavior. When this flag is set and the program detects it is being
run on WSL2, it will instead force the use of both the windows paths to `.aws` as well as the windows version of AWS-CLI.
It basically acts like it was run in Windows instead of WSL2.

## Exporting Credentials

Sometimes instead of syncing your credentials you need to capture them to be used elsewhere. You can use the `export`
flag for this. Note that when run this way you must specify a profile and your credentials are not synced back to your 
aws credentials file, they are only captured for output.

- To output credentials in dotenv format for the specified profile:
```commandline
$ nawsso --profile myprofile --export dotenv
NAWSSO_EXPIRES=1637612752000
AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX
AWS_SECRET_ACCESS_KEY=ZhSic9j0fTLlzx0k4y8OEiPBUH/Dms3B6Znku1LK
AWS_REGION=us-east-1
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEFsaCXVzLWVhc3QtMiJHMEUCIQDVPbpc8eUv2U9vEJuNcCtZn0sM/9FzQRJ...
```

- To output credentials in shell format for the specified profile:
```commandline
$ nawsso --profile myprofile --export shell
export NAWSSO_EXPIRES=1637612752000
export AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX
export AWS_SECRET_ACCESS_KEY=ZhSic9j0fTLlzx0k4y8OEiPBUH/Dms3B6Znku1LK
export AWS_REGION=us-east-1
export AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEFsaCXVzLWVhc3QtMiJHMEUCIQDVPbpc8eUv2U9vEJuNcCtZn0sM/9FzQRJ...
```

- To output credentials in arguments format for the specified profile:
```commandline
$ nawsso --profile myprofile --export arguments
NAWSSO_EXPIRES=1637612752000 AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX AWS_SECRET_ACCESS_KEY=ZhSic9j0fTLlzx0k4y8OEiPBUH/Dms3B6Znku1LK AWS_REGION=us-east-1 AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEFsaCXVzLWVhc3QtMiJHMEUCIQDVPbpc8eUv2U9vEJuNcCtZn0sM/9FzQRJ...
```

- To output credentials in json format for the specified profile:
```commandline
$ nawsso --profile myprofile --export json
{
  "expiration": 1637612752000,
  "accessKeyId": "ASIATB2AVIHW7HQE37KX",
  "secretAccessKey": "ZhSic9j0fTLlzx0k4y8OEiPBUH/Dms3B6Znku1LK",
  "region": "us-east-1",
  "sessionToken": "IQoJb3JpZ2luX2VjEFsaCXVzLWVhc3QtMiJHMEUCIQDVPbpc8eUv2U9vEJuNcCtZn0sM/9FzQRJ..."
}
```

- To output credentials and write them to a file (in this example using dotenv format):
```commandline
$ nawsso --profile myprofile --export dotenv > .env.myprofile
```

- To get credentials and set them just for running a single command (using xargs with bash):
```commandline
$ env $(nawsso --profile myprofile --export arguments | xargs) somecommand 
```

Note: The variable `NAWSSO_EXPIRES/expiration` is the datetime at which the session token will expire. 
It is encoded as the number of milliseconds since the Unix Epoch. This can optionally be used to perform 
sanity checks to confirm that the token is still valid in whatever environment you use the credentials
in.

## nawsso.config.json

You can optionally create a configuration file that will initialize nawsso with a list of accounts to
synchronize and log into. This can be used to configure a collection of accounts in one step. It will 
even work if you have never run `aws configure` (i.e. you have no existing configs or credentials or the
specified accounts are not configured in them).

Nawsso will automatically load `nawsso.config.json` if it exists in the folder it is run in as long as you do
no pass in a profile or starturl. Simply run `nawsso` (or you can force a new login using `nawsso --force`). 
You can also instruct nawsso to load from a specific config file by providing a path using the `--config` argument.
The nawsso config file should conform to the following interface.

- NawssoConfig interface
```typescript
interface NawssoConfig {
  sso: {
    starturl: string
    region: string
  }
  default_account?: {
    role?: string
    region?: string
    output?: string
  }
  accounts: {
    [key: string]: string | {
      id: string
      role?: string
      region?: string
      output?: string
    }
  }
}
```

The optional `default_account` properties will be merged with each account as they are read and will provide 
user definable default values if they are missing. The `accounts` property is a list of key value pairs where 
value can either be a simple string (in which case it is the account id) or an object consisting of the required 
property `id` and the optional properties `role`, `region`, and `output`. Role is defined as optional but
if it is not supplied by either the `default_account` or `account` it will throw an erro. The default value of 
region if not supplied is `us-east-1` and the default vaule of output is `yaml`.

- Example nawsso.config.json
```json
{
  "sso": {
    "starturl": "https://mycompany.awsapps.com/start#/",
    "region": "us-east-2"
  },
  "default_account": {
    "role": "RoleName",
    "region": "us-east-1",
    "output": "yaml"
  },
  "accounts": {
    "profile-1": "111111111111",
    "profile-2": "222222222222",
    "profile-3": {
      "id": "333333333333",
      "output": "json"
    }
  }
}
```

Each time you run nawsso like this it will ensure that all the specified accounts are synchronized with your aws config. Changes you
make in the aws config file to these profile will be overwritten if your run nawsso again.

Note: When run this way nawsso will log into **only** the accounts specified in the config file, even if there are existing profiles
in your aws config using the same sso starturl. If you want to log into all profiles using the same starturl in a folder containing 
a nawsso.config.json, you must use the --starturl to do so.
