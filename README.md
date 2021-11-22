nawsso
=======

Node AWS SSO Credentials Helper - sync up AWS CLI v2 SSO login session to legacy CLI v1 credentials.

## Prerequisite

- Required `Node >= 14.0`
- Required [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
- Assume you have already setup [AWS SSO](https://aws.amazon.com/single-sign-on/) for your organization

## Basic Usage

- Install using npm:
```commandline
$ npm install -g nawsso
```

- If you only have one AWS SSO setup you can sync all configured profiles without providing any parameters:
```commandline
$ nawsso
Synchronized credentials for 5 profile(s)
```

- To sync all credentials for the specified starturl (required when you have multiple SSO setups):
```commandline
$ nawsso --starturl https://myendpoint.awsapps.com/start
Synchronized credentials for 3 profile(s)
```

- To sync only a single profile:
```commandline
$ nawsso --profile myprofile
Synchronized credentials for profile 'myprofile'
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
AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEFsaCXVzLWVhc3QtMiJHMEUCIQDVPbpc8eUv2U9vEJuNcCtZn0sM/9Fzhh2jlbV7+lQRJQIgU+M9ivQcoOzYAjTkthXASOFOnlJlsazUbWtcsvddyVUqkwMIJBAEGgwyMTAwNTIxMzc0NTMiDCIURPIsWB4h/1ga0irwAnOHPIwj8fk5s9wU868DrvnE8g4jmpbUD7SiOCfNyNN9M7nec1wQHTMe5aDQ9T997PQhtlYaPSnglaz8ERb2KlCUsqLnMz47aV9VqWwtaRkZKI+d1DeOCUKn7zdy6pFDqqnPMAdXtqFpn8+hHNjaAQWncfE9TTlpGsQ49TR67/CaTXaj1ss1j9kfnyL/c2qhQtjCdu3TVBEv5FUl903e6vr658Ep/ejnxrQrCpVMvgDE5WjEFvMkuWE3bxrCckiAOsEAgWKK/PfsxPKrfc1Jyr9b7hJE/ZvOdJb0QvzjxNfSMCUHi2yKSC9NxmbtDPNAKYBXm4RdJp24hm6hLY2ok25yf+NXJyOE6DPhzeXxGUvvvnVdDVy3wojzv24D3S2RbrWdEAetCet5kxSSomDQW70Z78GTxKuLgraWAH/dsTxsunf4u/pRTvr/6Ccju5J25dFO3TgQgAe9V5BV4hEz94CwqpmBJgyD7KGwvdpd3uFiMKGX7IwGOqYBrAdDIi+rjpw/ms0w8iRhc1oIwfX4wErLtygBftaNIhOIrCG0IHTtnzFgqisTiHlJHmaop22h85Lxc/GkPVLGvZzri/woVHENNdNNDa6J8DvaFQijWl93cDneoRDcm/apEqJz1MmM1XVcCNj/eeS8lcS+ZJb3jpI2hdM85L8QBv4fTosQbYwXZeiCjwBUzklgDaRwWGNKhC8t433MPmXqoFjNqVx7Ag==
```

- To output credentials in shell format for the specified profile:
```commandline
$ nawsso --profile myprofile --export dotenv
export NAWSSO_AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX
export AWS_ACCESS_KEY_ID=ASIATB2AVIHW7HQE37KX
export AWS_SECRET_ACCESS_KEY=ZhSic9j0fTLlzx0k4y8OEiPBUH/Dms3B6Znku1LK
export AWS_SESSION_TOKEN=IQoJb3JpZ2luX2VjEFsaCXVzLWVhc3QtMiJHMEUCIQDVPbpc8eUv2U9vEJuNcCtZn0sM/9Fzhh2jlbV7+lQRJQIgU+M9ivQcoOzYAjTkthXASOFOnlJlsazUbWtcsvddyVUqkwMIJBAEGgwyMTAwNTIxMzc0NTMiDCIURPIsWB4h/1ga0irwAnOHPIwj8fk5s9wU868DrvnE8g4jmpbUD7SiOCfNyNN9M7nec1wQHTMe5aDQ9T997PQhtlYaPSnglaz8ERb2KlCUsqLnMz47aV9VqWwtaRkZKI+d1DeOCUKn7zdy6pFDqqnPMAdXtqFpn8+hHNjaAQWncfE9TTlpGsQ49TR67/CaTXaj1ss1j9kfnyL/c2qhQtjCdu3TVBEv5FUl903e6vr658Ep/ejnxrQrCpVMvgDE5WjEFvMkuWE3bxrCckiAOsEAgWKK/PfsxPKrfc1Jyr9b7hJE/ZvOdJb0QvzjxNfSMCUHi2yKSC9NxmbtDPNAKYBXm4RdJp24hm6hLY2ok25yf+NXJyOE6DPhzeXxGUvvvnVdDVy3wojzv24D3S2RbrWdEAetCet5kxSSomDQW70Z78GTxKuLgraWAH/dsTxsunf4u/pRTvr/6Ccju5J25dFO3TgQgAe9V5BV4hEz94CwqpmBJgyD7KGwvdpd3uFiMKGX7IwGOqYBrAdDIi+rjpw/ms0w8iRhc1oIwfX4wErLtygBftaNIhOIrCG0IHTtnzFgqisTiHlJHmaop22h85Lxc/GkPVLGvZzri/woVHENNdNNDa6J8DvaFQijWl93cDneoRDcm/apEqJz1MmM1XVcCNj/eeS8lcS+ZJb3jpI2hdM85L8QBv4fTosQbYwXZeiCjwBUzklgDaRwWGNKhC8t433MPmXqoFjNqVx7Ag==
```
