function checkAccount() {
  if(!window["web3"])
    return;
  if (web3.eth.accounts.length == 0) {
    $("#downloadMetamask").hide()
    if(!$("#unlockMetamask").is(":visible")) $("#unlockMetamask").show()
    if( $("#goStep2").is(":visible")) $("#goStep2").hide()

    if(!$("#unlockMetamask2").is(":visible")) $("#unlockMetamask2").show()
    $("#downloadMetaMask2").hide()
    $("#claimNow").hide()

  } else {
    $("#downloadMetamask").hide()
    $("#downloadMetaMask2").hide()

    $("#unlockMetamask").hide()
    $("#goStep2").show()

    $("#ethAddress input").val(web3.eth.accounts[0])

    //Check balance of the account
    web3.eth.getBalance(web3.eth.accounts[0], function (error, result) {
      if (!error) {
        balance = result.toNumber()
        if(balance>0){
          if(!$(".txid").is(":visible")) {
              $("#claimNow").show()
          }

          $("#noBalance").hide()

          

        }else{
          $("#claimNow").hide()
          $("#noBalance").show()
        }
      } else {
        console.error(error);
      }
    })
  }
}



// Check if MetaMask is installed
window.addEventListener('load', function () {
// Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    console.log("web3 SI");
    // Use Mist/MetaMask's provider
    if (!window.web3) {
      window.web3 = new Web3(web3.currentProvider);
    }
  } else {
    console.log("web3 NO");
    window.web3 = new Web3(new Web3.providers.HttpProvider(web3provider));

  }

  web3.version.getNetwork(function(err, netId){
    if(netId!=1){
      console.log('%c Not main net! ', 'background: red; color: #ffffff; font-size:15px;');
      //$("#notMainNet").show()
    }else{
      //$("#notMainNet").hide()
    }
  });
})
