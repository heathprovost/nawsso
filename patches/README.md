# Patches

The directory contains npm module patches created using [patch-package](https://www.npmjs.com/package/patch-package).

## Current Patches

### ini

This module has a safety rule hardcoded in it that forces values to be quoted when they contain the '=' character and 
auto escapes the # character. This behavior is not necessary when writing to AWS credentials files and can cause issues 
with other programs. This patch simply removes that safety rule so that strings containing the '=' character are no longer 
quoted and the # character is left unescaped.
