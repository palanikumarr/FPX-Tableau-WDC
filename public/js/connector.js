/**
* @author Palanikumar Rajendran
* FPX - Web Data Connector for Tableau.
**/
(function() {
    //Show Login Form On Load
    $("div#login-modal").show();

    $("#loginButton").click(function() {
        //Prepare payload for FPX Login
        var payload = {
            username: $("#username").val(),
            password: $("#password").val()
        };
        FPX.loginFPX(payload, $("#endPoint").val());
    });
})();

//Modularize FPX related code. 
var FPX = (function(loadCallback) {

    //Default FPX API Base URL Endpoint 
    var BASE_URL = 'https://sbx.fpx.com/rs/15/cpq';
    
    var resultArray = [], LOG = "", CURSOR_ID = '', BATCH_SIZE = 500;

    // constructs a URL to query FPX's API table using FPX REST Endpoint
    var constructFPXQuery = function() {
        return BASE_URL + "?query=" + encodeURIComponent($("#query").val()) + "&batchsize=" + BATCH_SIZE;
    };

    //FPX API will support only Maximum 500 records per transaction.
    //So Using the CursorID call the same query again and again until all records fetched.
    var getMoreData = function() {
        // Hide the error message panel.
        $("#msg1").html("");
        $(".alert").hide();

        var queryString = BASE_URL + "?cursor=" + CURSOR_ID;
        $.ajax({
            url: '/proxy?url=' + queryString,
            type: 'GET',
            contentType: 'application/json',
            success: function(data) {
                populateResult(data);
            },
            error: function(xhr, ajaxOptions, thrownError) {
                // If the connection fails, log the error and return an empty set.
                LOG = "Connection error: " + xhr.responseText + "\n" + thrownError;
                //Show the error div.
                $("#msg1").html(data.error);
                $(".alert").show();
            }
        });
    };

    //Common Util method to populate data into resultsArray object. If still data need to fetched then call getMoreData method.
    //Once all the result is fetched then call the loadCallback method.
    var populateResult = function(data) {
        if (data.records) {
            var records = data.records;
            for (var i = 0; i < records.length; i++) {
                var row = {};
                var record = records[i];
                for (field in record) {
                    row[field] = record[field];
                }
                resultArray.push(row);
            }
            CURSOR_ID = data.cursorid;

            if (resultArray.length >= data.size) {
                $("#loading-mask").hide();
                loadCallback(resultArray);
            } else {
                getMoreData();
            }
        }
    };

    return {
        //FPX public method to Load the FPX data from the Query specified.
        loadFPXData: function() {
            $.ajax({
                url: '/proxy?url=' + constructFPXQuery(),
                type: 'GET',
                contentType: 'application/json',
                success: function(data) {
                    populateResult(data);
                },
                error: function(xhr, ajaxOptions, thrownError) {
                    // If the connection fails, log the error and return an empty set.
                    LOG = "Connection error: " + xhr.responseText + "\n" + thrownError;
                    $("#msg1").html(xhr.responseText);
                    $(".alert").show();
                }
            });
        },
        //FPX public method to Login into FPX API.
        loginFPX: function (payload, endPoint) {
            BASE_URL = endPoint;
            $("#loading-mask").show();
            var LOGIN_URL = BASE_URL + '/login';
            //Make AJAX call to FPX Rest API
            var req = $.ajax({
                url: '/proxy?url=' + LOGIN_URL,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload),

                success: function(data) {
                    if (data.success == true) {
                        $("div#login-modal").hide();
                        $("div#more-data").show();
                        $("#moreData").click(function() {
                            $("#loading-mask").show();
                            FPX.loadFPXData();
                        });
                        $("#loading-mask").hide();
                    } else {
                        $(".alert").show();
                        $("#msg").html(data.error);
                    }
                },
                error: function(xhr, ajaxOptions, thrownError) {
                    // If the connection fails Display that to User
                    $("#msg").html("Error while trying to connecto to FPX Server");
                }
            });
        }
    }
    //Callback method for FPX Module. Self calling module.
})(function(results) {
    
    var fieldNames = getArrayFromInput('fieldNames');
    var fieldTypes = getArrayFromInput('dataTypes');
    var conData = {};
    conData.fieldNames = fieldNames;
    conData.fieldTypes = fieldTypes;
    conData.results = results;
    tableau.connectionData = JSON.stringify(conData);
    tableau.submit();
});

//Public util method to get the Array from element.
var getArrayFromInput = function(eleId) {
    return document.getElementById(eleId).value.split(",").map(function(item) {
        return $.trim(item);
    });
};

var FPXConnector = tableau.makeConnector();

FPXConnector.init = function() {

    FPXConnector._recordsFetched = 0;
    tableau.connectionName = 'FPX Web Data Connector';
    tableau.initCallback();
};

FPXConnector.getColumnHeaders = function() {
    var conData = JSON.parse(tableau.connectionData);
    tableau.headersCallback(conData.fieldNames, conData.fieldTypes);
};

FPXConnector.getTableData = function(lastRecordToken) {
    var conData = JSON.parse(tableau.connectionData);
    tableau.dataCallback(conData.results, lastRecordToken, false);
};

tableau.registerConnector(FPXConnector);
