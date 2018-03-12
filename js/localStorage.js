var ls={
  clearStorage: function(){
      localStorage.removeItem("wallet")
      localStorage.removeItem("ethAddress")
  },
  setWallet: function(wallet){
    wallet = ( typeof wallet !== 'undefined' && ( (wallet == 'metamask') || (wallet == 'coincrowd') || (wallet == 'other') ) )  ? wallet : "metamask";
    var old = null

    $(".changeWallet").show()

    if(localStorage.getItem("wallet")){
      //location.reload();
      $(".currentWallet." + localStorage.getItem("wallet")).fadeOut()
      localStorage.removeItem("wallet")
      $(".changeWallet").hide()
      return;
    }else{
      //location.reload();
      localStorage.setItem("wallet", wallet);
      $(".currentWallet." + wallet).fadeIn()
      if(wallet=="metamask"){
        $("#ethAddress input").prop("readonly", true);
        $("#ethAddress input").addClass("no-drop")

        checkAccount()
        $('#ethAddress input').trigger("change")
      }else{
        $("#ethAddress input").prop("readonly", false);
        $("#ethAddress input").removeClass("no-drop")
      }

    }
  },

  getWallet: function(){
      return localStorage.getItem("wallet");
  },

  setWalletSwitch: function(){
    var wallet = this.getWallet()
    if(wallet){
      return true;
    }else{
      return false;
    }
  },

  nonWallet: function(){
    var wallet = this.getWallet()
    if("metamask" == wallet)
      return "coincrowd"
    return "metamask"
  }
};


//UI

ls.setWalletSwitch()
window.addEventListener('load', function () {

  if(window.web3)
    var account = web3.eth.accounts[0];




  setInterval(function() {

    if (web3 && web3.eth.accounts[0] && web3.eth.accounts[0] !== account) {
      account = web3.eth.accounts[0];
      $('#ethAddress input').trigger("change")
      checkAccount();

    }

    var wallet = ls.getWallet()
    var ethAddress = localStorage.getItem("ethAddress");

    if(ethAddress){
      $("#ethAddressSelected").show()
      $("#ethAddressSelected input").val(ethAddress)

      $("#ethAddressCheck").hide()
      $("#walletSelectionBox").show()
      $(".currentWallet." + wallet).fadeIn()
    }else{
      if(wallet){
        $("#ethAddressCheck").show()
      }
    }
    //Show the wallet switch if wallet is selected in Local Sotarge

    //console.log("wallet",wallet);
    if(wallet){
      //$(".switchWallet .box").show()
      $(".walletSelection").hide()

      $("#" + wallet ).show()
      $("#" + ls.nonWallet() ).hide()

      if(wallet=="coincrowd"){
        //Wallet is CoinCrowd
        $("#switchCoincrowd").hide()
        $("#switchMetamask").show()
        $("#goStep2").show()
      }else if(wallet=="other"){

        $("#goStep2").show()
      }else{
        //Wallet is MetaMask
        $("#switchMetamask").hide()
        $("#switchCoincrowd").show()

        //var check  = hideGo2()
        //if(!check){ checkAccount() }
        //checkAccount()

      }


    }else{
      $("#switchCoincrowd").hide()
      $("#switchMetamask").hide()
    }

    ls.setWalletSwitch()
  }, 100)

})
