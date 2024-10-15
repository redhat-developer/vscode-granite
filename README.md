# vscode-granite
<!-- ABOUT THE PROJECT -->
### About The Project

We aim to implement a feature-rich local AI co-pilot for Visual Studio Code, by utilizing a collection of open-source components: [Granite code models](https://github.com/ibm-granite/granite-code-models), [Ollama](https://github.com/ollama/ollama), and [Continue.dev](https://github.com/continuedev/continue). By running Granite models locally, we ensure compliance with data privacy and licensing requirements. Our integration focuses on working with Continue to seamlessly interact with Visual Studio Code, helping developers streamline their workflow, boost productivity, and write higher-quality code.

#### Reasons to Choose Ollama

- **Data Privacy:** Many corporations have privacy regulations that prohibit sending internal code or data to third-party services.
- **Generated Material Licensing:** Many models, even those with permissive usage licenses, do not disclose their training data and therefore may produce output that is derived from training material with licensing restrictions.
- **Cost:** Many of these tools are paid solutions that require investment by the organization. For larger organizations, this would often include paid support and maintenance contracts, which can be extremely costly and slow to negotiate.

#### Why Continue.dev
 
 [Continue](https://docs.continue.dev) is the leading open-source AI code assistant. You can connect any models and any context to build custom autocomplete and chat experiences inside [VS Code](https://marketplace.visualstudio.com/items?itemName=Continue.continue) and [JetBrains](https://plugins.jetbrains.com/plugin/22707-continue-extension)

* Easily understand code sections
* Tab to autocomplete code suggestions
* Refactor functions where you are coding
* Ask questions about your codebase
* Quickly use documentation as context

For more details, refer to [continue.dev](https://github.com/continuedev/continue)

#### Granite code models 

vscode-granite uses the Granite Code model, which is optimized for enterprise software development workflows and performs well across a range of coding tasks (e.g., code generation, fixing, and explanation), making it a versatile "all-around" code model.
Granite Code comes in a wide range of sizes to fit your workstation's available resources. Generally, the bigger the model, the better the results.

**Recommendation:** Model Size 8b for chat, 8b for tab code completion.
For more details, refer to [Granite Code Models](https://github.com/ibm-granite/granite-code-models)

#### Installation Prerequisites:
  * OS: Cross Platform 
  * DISK SPACE :Minimum 30 GB 
  * latest [Visual Studio Code](https://code.visualstudio.com/)
#### Use Vscode-granite UI to install extension and models

This project provides a user-friendly UI that simplifies the installation and management of extensions and Granite models. Developers can easily set up and configure their environment, and access the setup wizard anytime via the command palette by running "Granite: Setup Granite Code as code assistant".

 step 1: **Install the Extension**

Open VSCode and navigate to the Extensions tab on the left sidebar. select on "vscode-granite" then click "install" to install the extension.
 
 step 2:  **Install ollama**

Once the extension is running, a new window will prompt you to install Ollama. 

The [Continue.dev](https://continue.dev/) extension, if not already installed, will be automatically added as a dependency during this process. 

you will be presented with the following installation options for installing ollama :

1. **Install with Homebrew**: If Homebrew is detected on your machine (Mac/Linux).
2. **Install with Script**: Available on Linux.
3. **Install Manually**: Supported on all platforms( If you choose to install Ollama manually, you will be redirected to the official [Ollama download page](https://ollama.com/download) to complete the installation process).

Once Ollama is installed, the page will refresh automatically.

![installollama](media/installollama.gif)
step 3: **Install granite models** 

 select the Granite model you wish to install. Follow the on-screen instruction to complete the setup of your models.
![installmodels](media/installmodels.gif)
Once the models are pulled into Ollama, Continue will be configured automatically to use them, the Continue chat view will open , enabling you to interact with the models via the UI.
### License
Apache 2.0, See [LICENSE](LICENSE) for more information.

### Telemetry

With your approval, the vscode-granite extension collects anonymous [usage data](USAGE_DATA.md) and sends it to Red Hat servers to help improve our products and services.
Read our [privacy statement](https://developers.redhat.com/article/tool-data-collection) to learn more.
This extension respects the `redhat.telemetry.enabled` setting, which you can learn more about at https://github.com/redhat-developer/vscode-redhat-telemetry#how-to-disable-telemetry-reporting
