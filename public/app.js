document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('downloadForm');
    const resultDiv = document.getElementById('result');
    const resultMessage = document.getElementById('resultMessage');
    const loader = document.getElementById('loader');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadControllersBtn = document.getElementById('loadControllersBtn');
    const controllersLoader = document.getElementById('controllersLoader');
    const controllerNameSelect = document.getElementById('controllerName');
    const controllerVersionSelect = document.getElementById('controllerVersion');
    const logsPanel = document.getElementById('logsPanel');
    const logsContent = document.getElementById('logsContent');

    let controllersData = [];

    function displayLogs(logs) {
        if (!logs || logs.length === 0) return;

        logsContent.innerHTML = '';
        logs.forEach(log => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';

            if (log.includes('ERROR')) {
                logEntry.classList.add('error');
            } else if (log.includes('SUCCESS') || log.includes('✓')) {
                logEntry.classList.add('success');
            } else {
                logEntry.classList.add('info');
            }

            logEntry.textContent = log;
            logsContent.appendChild(logEntry);
        });

        logsPanel.classList.remove('hidden');
        // Scroll to bottom of logs
        logsContent.scrollTop = logsContent.scrollHeight;
    }

    // Load controllers from database
    loadControllersBtn.addEventListener('click', async function() {
        // Hide previous results
        resultDiv.classList.add('hidden');
        resultDiv.classList.remove('success', 'error');

        // Show loader
        controllersLoader.classList.remove('hidden');
        loadControllersBtn.disabled = true;

        // Collect database config
        const dbConfig = {
            user: document.getElementById('dbUser').value,
            password: document.getElementById('dbPassword').value,
            server: document.getElementById('dbServer').value,
            database: document.getElementById('dbDatabase').value,
            port: parseInt(document.getElementById('dbPort').value),
            options: {
                encrypt: false,
                enableArithAbort: false
            },
            pool: {
                min: 0,
                max: 10,
                idleTimeoutMillis: 3000
            }
        };

        try {
            const response = await fetch('/api/controllers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dbConfig })
            });

            const result = await response.json();

            // Hide loader
            controllersLoader.classList.add('hidden');
            loadControllersBtn.disabled = false;

            if (result.success) {
                controllersData = result.controllers;

                // Get unique controller names
                const uniqueNames = [...new Set(controllersData.map(c => c.Name))];

                // Clear and populate controller name dropdown
                controllerNameSelect.innerHTML = '<option value="">-- Select a controller --</option>';
                uniqueNames.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    controllerNameSelect.appendChild(option);
                });

                // Show success
                resultDiv.classList.remove('hidden');
                resultDiv.classList.add('success');
                resultMessage.innerHTML = `<strong>Success!</strong> Loaded ${controllersData.length} controller(s) from database.`;
            } else {
                // Show error
                resultDiv.classList.remove('hidden');
                resultDiv.classList.add('error');
                resultMessage.innerHTML = `<strong>Error:</strong> ${result.message}`;
            }
        } catch (error) {
            // Hide loader
            controllersLoader.classList.add('hidden');
            loadControllersBtn.disabled = false;

            // Show error
            resultDiv.classList.remove('hidden');
            resultDiv.classList.add('error');
            resultMessage.innerHTML = `<strong>Error:</strong> Failed to connect to server. ${error.message}`;
        }
    });

    // Handle controller name selection
    controllerNameSelect.addEventListener('change', function() {
        const selectedName = this.value;

        if (!selectedName) {
            controllerVersionSelect.innerHTML = '<option value="">-- Select controller first --</option>';
            return;
        }

        // Get versions for selected controller
        const versions = controllersData
            .filter(c => c.Name === selectedName)
            .map(c => c.Version)
            .sort((a, b) => b - a); // Sort descending

        // Clear and populate version dropdown
        controllerVersionSelect.innerHTML = '<option value="">-- Select a version --</option>';
        versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = `Version ${version}`;
            controllerVersionSelect.appendChild(option);
        });
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Hide previous results
        resultDiv.classList.add('hidden');
        resultDiv.classList.remove('success', 'error');
        logsPanel.classList.add('hidden');
        logsContent.innerHTML = '';

        // Show loader
        loader.classList.remove('hidden');
        downloadBtn.disabled = true;

        // Collect form data
        const dbConfig = {
            user: document.getElementById('dbUser').value,
            password: document.getElementById('dbPassword').value,
            server: document.getElementById('dbServer').value,
            database: document.getElementById('dbDatabase').value,
            port: parseInt(document.getElementById('dbPort').value),
            options: {
                encrypt: false,
                enableArithAbort: false
            },
            pool: {
                min: 0,
                max: 10,
                idleTimeoutMillis: 3000
            }
        };

        const downloadConfig = {
            controllerName: document.getElementById('controllerName').value,
            controllerVersion: parseInt(document.getElementById('controllerVersion').value),
            outputPath: document.getElementById('outputPath').value
        };

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dbConfig,
                    downloadConfig
                })
            });

            const result = await response.json();

            // Hide loader
            loader.classList.add('hidden');
            downloadBtn.disabled = false;

            // Display logs
            if (result.logs) {
                displayLogs(result.logs);
            }

            // Show result
            resultDiv.classList.remove('hidden');
            if (result.success) {
                resultDiv.classList.add('success');
                let message = `<strong>Success!</strong> ${result.message}`;
                if (result.workflowCount) {
                    message += `<br>Workflows saved to: ${result.outputDir}`;
                }
                resultMessage.innerHTML = message;
            } else {
                resultDiv.classList.add('error');
                resultMessage.innerHTML = `<strong>Error:</strong> ${result.message}`;
            }
        } catch (error) {
            // Hide loader
            loader.classList.add('hidden');
            downloadBtn.disabled = false;

            // Show error
            resultDiv.classList.remove('hidden');
            resultDiv.classList.add('error');
            resultMessage.innerHTML = `<strong>Error:</strong> Failed to connect to server. ${error.message}`;
        }
    });
});
