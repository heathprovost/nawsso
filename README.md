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

Sometimes instead of syncing your credentials you need to capture them to be used elsewhere. You can use the `--export`
flag for this. Note that when run this way you must specify a profile and your credentials are not synced back to your 
aws credentials file, they are only captured for output.

- To output credentials in dotenv format for the specified profile:
```commandline
$ nawsso --profile myprofile --export dotenv
NAWSSO_AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX
AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX
AWS_SECRET_ACCESS_KEY=ZhSic9j0fTLlzx0k4y8OEiPBUH/Dms3B6Znku1LK
AWS_REGION=us-east-1
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEFsaCXVzLWVhc3QtMiJHMEUCIQDVPbpc8eUv2U9vEJuNcCtZn0sM/9FzQRJ...
```

- To output credentials in shell format for the specified profile:
```commandline
$ nawsso --profile myprofile --export shell
export NAWSSO_AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX
export AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX
export AWS_SECRET_ACCESS_KEY=ZhSic9j0fTLlzx0k4y8OEiPBUH/Dms3B6Znku1LK
export AWS_REGION=us-east-1
export AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEFsaCXVzLWVhc3QtMiJHMEUCIQDVPbpc8eUv2U9vEJuNcCtZn0sM/9FzQRJ...
```

- To output credentials in dotenv format and write them to a file:
```commandline
$ nawsso --profile myprofile --export dotenv > .env.myprofile
```

Note: An extra variable named `NAWSSO_AWS_ACCESS_KEY_ID` is also generated. This can optionally be used to perform sanity checks to confirm the 
origin of the AWS variables in whatever environment you use them in. When `NAWSSO_AWS_ACCESS_KEY_ID === AWS_ACCESS_KEY_ID` you can be confident 
that all of the AWS variables were generated together by nawsso.
