#!/bin/bash

# install awscli v2
pushd /tmp
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
popd

# rename and backup containers ~./.npmrc as it causes issues with nvm: https://github.com/nvm-sh/nvm/issues/2340
mv ~/.npmrc ~/.npmrc.backup

# wire up nvm manually since we are not running in an interactive shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# install LTS version of node using nvm and setup .nmvrc file (.nvmrc is intentionally untracked in git, so only write if the user doesnt have one already)
nvm install --lts --latest-npm
if [[ ! -e .nvmrc ]]; then
  echo "lts/*" > .nvmrc
fi
nvm use

# install npm dependencies
npm ci