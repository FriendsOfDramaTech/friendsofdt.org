// NAV MENU ONCLICK
$(".menu-toggle-btn").click(function(){
    $(this).toggleClass("fa-times");
    $(".navigation-menu").toggleClass("active");
});

// E-mail Adjuster
$(document).ready(function () {
  $('a[href^="#contact:"]').on('click', function (e) {
    var self = $(this),
        localPart = self.attr('href').replace(/^#contact:/, ''),
        mailtoUrl = 'mailto:' + localPart + '@friendsofdt.org';
    e.preventDefault();
    window.open(mailtoUrl, '_self');
  });
});