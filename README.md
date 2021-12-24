nawsso
=======

Node AWS SSO Credentials Helper - sync up AWS CLI v2 SSO login session to legacy CLI v1 credentials.

## Prerequisite

- Required `Node >= 16`
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

- To output credentials in dotenv format and write them to a file:
```commandline
$ nawsso --profile myprofile --export dotenv > .env.myprofile
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
no pass in a profile or starturl. Simply run `nawsso` (or you can force a new login using `nawsso --force`)

- Example nawsso.config.json (all fields are strings and are required)
```json
{
  "sso": {
    "starturl": "https://mycompany.awsapps.com/start#/",
    "region": "us-east-2"
  },
  "accounts": [
    {
      "name": "profile-1",
      "id": "111111111111",
      "role": "RoleName",
      "region": "us-east-1",
      "output": "yaml"
    },
    {
      "name": "profile-2",
      "id": "222222222222",
      "role": "RoleName",
      "region": "us-east-1",
      "output": "yaml"
    },
    {
      "name": "profile-3",
      "id": "333333333333",
      "role": "RoleName",
      "region": "us-east-1",
      "output": "yaml"
    }
  ]
}
```

Each time you run nawsso like this it will ensure that all the specified accounts are synchronized with your aws config. Changes you
make in the aws config file to these profile will be overwritten if your run nawsso again.

Note: When run this way nawsso will log into **only** the accounts specified in the config file, even if there are existing profiles
in your aws config using the same sso starturl. If you want to log into all profiles using the same starturl in a folder containing 
a nawsso.config.json, you must use the --starturl to do so.
