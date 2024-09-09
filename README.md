# Python Environemnt Test

Welcome to the Python Environemnt Test! This repository will walk you through the steps to clone the repository, set up the environment using `uv`, and use the project within Visual Studio Code (VSCode).

## Prerequisites

Before you begin, ensure you have the following installed on your system:

1. **Git**: To clone the repository.
2. **Python**: Make sure Python is installed. You don't need the exact version specified by the project; `uv` will handle that.
3. **VSCode**: The recommended code editor for this project.
4. **Python Extension for VSCode**: This extension provides features like linting, debugging, and IntelliSense.

### Install Git
If Git is not installed, you can download and install it from [here](https://git-scm.com/downloads).

### Install Python
If Python is not installed, you can download and install it from [here](https://www.python.org/downloads/). You don't need the exact version specified by the project; `uv` will handle that.

### Install VSCode
If VSCode is not installed, you can download and install it from [here](https://code.visualstudio.com/).

### Install Python Extension for VSCode
Open VSCode, go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window, and search for "Python". Click "Install" to add the extension.

## Step 1: Clone the Repository

Start by cloning the repository to your local machine:

```bash
git clone https://github.com/yutawatabe/python_environment_test.git
cd my_project
```

## Step 2: Install uv

If you don't have uv installed, you can install it via pip:

```bash
pip install uv
```

You can also try installing Powershell on Windows or Curl on MacOS. For the tutorial, look at [here](https://docs.astral.sh/uv/getting-started/installation/.).

## Step 3: Open the Project in VSCode

Launch VSCode and open the project folder:

### Step 4: Create the virtual environment and install Python

The pyproject.toml and uv.lock files specifies the Python version required for the project. The following command can create the virtual environment (.venv folder) in the project folder.

```bash
uv venv
```

### Step 5: Install the packages 

The uv.lock file contains the required packages for this packages. The following command will install the packages in .venv folder.

```bash
uv sync
```

If you want to add the packages, you can do the following:

```bash
uv add "package name"
uv lock
uv sync
```

These commands will add the packages to the toml file, update the lock file and install the updated packages to the .venv folder.

## Step 6: Activate the Environment
In VSCode's integrated terminal:
- Open a new terminal by pressing `Ctrl+`` (backtick).
- Activate the uv environment:

```bash
source .venv/Scripts/activate
```

This activates the isolated environment where all dependencies are installed.

### Step 7: Select the Python Interpreter

1. Press Ctrl+Shift+P (or Cmd+Shift+P on macOS) to open the Command Palette.
2. Type Python: Select Interpreter and press Enter.
3. Select the interpreter located in the .uv directory. It should be something like:

```bash
.venv/Scripts/python.exe
```

## Step 8: Run and Debug the Code

With the environment set up and activated, you can now run and debug the code:
- Open any Python file from the src directory.
- Click the "Run" button (a green play icon) at the top right, or press F5 to start debugging.
- VSCode will use the uv environment, ensuring that the correct Python version and dependencies are in use.
