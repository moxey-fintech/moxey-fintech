(function () {
    'use strict';

    angular.module('BlurAdmin.pages.services.currencyConversionService.currencyConversionSettings')
        .controller('CurrencyConversionSettingsCtrl', CurrencyConversionSettingsCtrl);

    /** @ngInject */
    function CurrencyConversionSettingsCtrl($rootScope,$scope,localStorageManagement,$http,$ngConfirm,environmentConfig,$uibModal,
                                        $timeout,toastr,$location,errorHandler,extensionsHelper,typeaheadService,Rehive) {

        var vm = this;
        vm.token = localStorageManagement.getValue('TOKEN');
        vm.baseUrl = null; 
        var serviceName = "conversion_service";
        $rootScope.dashboardTitle = 'Conversion extension | Moxey';
        $scope.currencyConversionSettingView = '';
        $scope.deactivatingCurrencyConversion = false;
        $scope.loadingSettings = true;
        $scope.displayCurrency = "";
        $scope.operationalAccount = null;
        $scope.searchUser = false;
        $scope.loadingAccounts = false;
        $scope.getUsersEmailTypeahead = typeaheadService.getUsersEmailTypeahead();
        $scope.getAccountsReferenceTypeahead = typeaheadService.getAccountsReferenceTypeahead();
        $scope.searchOperationalAccountBy = 'standalone';
        $scope.userEmailForOperationalAccount = '';
        $scope.standaloneAccountOptions = [];
        $scope.userAccountOptions = [];

        $scope.goToCurrencyConversionSetting = function (setting) {
            $scope.currencyConversionSettingView = setting;
        }; 

        vm.getStandaloneAccounts = function(){
            if(vm.token){
                Rehive.admin.accounts.get({filters: {
                    user__isnull: true,
                    page_size: 50
                }}).then(function (res) {
                    $scope.standaloneAccountOptions = res.results;
                    $scope.standaloneAccountOptions = $scope.standaloneAccountOptions.sort(function(a, b){
                        return a.name < b.name ? 1 : a.name === b.name ? 0 : 1;
                    });
                    $scope.$apply();
                }, function (error) {
                    errorHandler.evaluateErrors(error);
                    errorHandler.handleErrors(error);
                    $scope.$apply();
                });
            }
        };

        vm.getCurrencies = function () {
            if(vm.token){
                $scope.loadingSettings = true;
                $http.get(vm.baseUrl + 'admin/currencies/', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': vm.token
                    }
                }).then(function (res) {
                    $scope.currenciesList = res.data.data.results;
                    $scope.loadingSettings = false;
                }).catch(function (error) {
                    $scope.loadingSettings = false;
                    errorHandler.evaluateErrors(error.data);
                    errorHandler.handleErrors(error);
                });
            }            
        };

        vm.getCompanySettings = function(){
            if(vm.token){
                $scope.loadingSettings = true;
                $http.get(vm.baseUrl + 'admin/company/', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': vm.token
                    }
                }).then(function (res) {
                    $scope.displayCurrency = res.data.data.display_currency;
                    $scope.operationalAccount = res.data.data.operational_account;
                    if($scope.operationalAccount){
                        vm.getAccountByReference();
                    } 
                    $scope.loadingSettings = false;
                }).catch(function (error) {
                    $scope.loadingSettings = false;
                    errorHandler.evaluateErrors(error.data);
                    errorHandler.handleErrors(error);
                });
            }
        };   
        
        //#region Operational account handling        
        vm.getAccountByReference = function(){
            $scope.loadingAccounts = true;
            Rehive.admin.accounts.get({filters: {reference: $scope.operationalAccount}})
                .then(function(res){
                    if(res.results && res.results.length > 0){
                        $scope.userEmailForOperationalAccount = res.results[0].user ? (res.results[0].user.email ? res.results[0].user.email : res.results[0].user.id) : null;
                        if($scope.userEmailForOperationalAccount){
                            $scope.searchOperationalAccountBy = 'user';
                            $scope.onSelect($scope.userEmailForOperationalAccount, $scope.operationalAccount);
                        } else if($scope.standaloneAccountOptions.length > 0) {
                            $scope.operationalAccount = $scope.standaloneAccountOptions.find(function(account) {
                                return account.reference === res.results[0].reference;
                            });
                        }
                    }
                    $scope.loadingAccounts = false;
                    $scope.$apply();
                }, function(error){
                    $scope.loadingAccounts = false;
                    errorHandler.evaluateErrors(error.data);
                    errorHandler.handleErrors(error);
                    $scope.$apply();
                });
        };

        $scope.emailChanging = function(){
            $scope.showAccounts = false;
        };

        $scope.triggerSearchByUser = function(){           
            $scope.getUserAccounts($scope.userEmailForOperationalAccount, null);
        };

        $scope.onSelect = function($model){
            $scope.getUserAccounts($model);
       };

       $scope.getUserAccounts = function(userEmail, accountRef){
           $scope.userAccountOptions = [];
           $scope.loadingAccounts = true;
           Rehive.admin.accounts.get({filters: {page_size: 250, user: userEmail}}).then(function (res) {
               if(res.results.length > 0) {
                   $scope.userAccountOptions = res.results.slice();
               }
               if(accountRef){
                   $scope.operationalAccount = $scope.userAccountOptions.find(function(account){
                       return (account.reference == $scope.operationalAccount);
                   });
               }
               $scope.showAccounts = true;
               $scope.loadingAccounts = false;
               $scope.$apply();
           }, function (error) {
               $scope.loadingAccounts = false;
               errorHandler.evaluateErrors(error);
               errorHandler.handleErrors(error);
               $scope.$apply();
           });
       };

        $scope.onSelect = function($model, accountRef){
            accountRef ? $scope.getUserAccounts($model, accountRef) : $scope.getUserAccounts($model, null);
        };
        //#endregion

        $scope.saveCompanySettings = function(){
            var updatedSettings = {display_currency: $scope.displayCurrency};
            if($scope.operationalAccount){
                updatedSettings.operational_account = $scope.operationalAccount.reference;
            }
            if(vm.token){
                $scope.loadingSettings = true;
                $http.patch(vm.baseUrl + 'admin/company/', updatedSettings, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': vm.token
                    }
                }).then(function (res) {
                    toastr.success("Company settings for extension updated successfully.");
                    vm.getCompanySettings();
                    $scope.loadingSettings = false;
                }).catch(function (error) {
                    $scope.loadingSettings = false;
                    errorHandler.evaluateErrors(error.data);
                    errorHandler.handleErrors(error);
                });
            }
        };     

        $scope.deactivateCurrencyConversionServiceConfirm = function () {
            $ngConfirm({
                // title: 'Deactivate service',
                title: 'Deactivate extension',
                contentUrl: 'app/pages/services/currencyConversionService/currencyConversionSettings/' +
                'currencyConversionDeactivation/currencyConversionDeactivationPrompt.html',
                animationBounce: 1,
                animationSpeed: 100,
                scope: $scope,
                buttons: {
                    Add: {
                        text: "Deactivate",
                        btnClass: 'btn-default dashboard-btn',
                        keys: ['enter'], // will trigger when enter is pressed
                        action: function(scope){
                            scope.deactivateCurrencyConversionService();
                        }
                    },
                    close: {
                        text: "Cancel",
                        btnClass: 'btn-primary dashboard-btn'
                    }
                }
            });
        };

        $scope.deactivateCurrencyConversionService = function () {
            if(vm.token) {
                $scope.deactivatingCurrencyConversion = true;
                $http.get(environmentConfig.API + 'admin/services/?slug=conversion_service', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': vm.token
                    }
                }).then(function (res) {
                    var serviceId = res.data.data.results[0].id;
                    $http.patch(environmentConfig.API + 'admin/services/' + serviceId + '/',{active: false}, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': vm.token
                        }
                    }).then(function (res) {
                        if (res.status === 200 || res.status === 201) {
                            $timeout(function () {
                                $scope.deactivatingCurrencyConversion = false;
                                toastr.success('Extension has been successfully deactivated');
                                // $location.path('/services');
                                $location.path('/extensions');
                            },600);
                        }
                    }).catch(function (error) {
                        $scope.deactivatingCurrencyConversion = false;
                        errorHandler.evaluateErrors(error.data);
                        errorHandler.handleErrors(error);
                    });
                }).catch(function (error) {
                    $scope.deactivatingCurrencyConversion = false;
                    errorHandler.evaluateErrors(error.data);
                    errorHandler.handleErrors(error);
                });
                
            }
        };

        vm.fetchServiceUrl = function(serviceName){
            extensionsHelper.getActiveServiceUrl(serviceName)
            .then(function(serviceUrl){
                vm.baseUrl = serviceUrl;
                $scope.goToCurrencyConversionSetting('settings');
                vm.getCurrencies();
                vm.getCompanySettings();
            })
            .catch(function(err){
                $scope.loadingSettings = false;
                toastr.error("Extension not activated for company");
                $location.path('/extensions');
            });
        };
        vm.fetchServiceUrl(serviceName);
        vm.getStandaloneAccounts();  

    }
})();
