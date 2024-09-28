# Tests

## Local CLI Testing

```shell
# Create tmp directory
mkdir tmp
cd tmp

# Setup new project
npm init

# Install package
npm install ../
```

## Local packaging testing

Run the following command to see what is going to be included in the package upon publishing

```shell
# Package
npm pack

# Unpack
tar -xvf <package-name>-<version>.tgz
```
