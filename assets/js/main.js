$(document).ready(function () {
  $('a[href^="#contact:"]').on('click', function (e) {
    var self = $(this),
        localPart = self.attr('href').replace(/^#contact:/, ''),
        mailtoUrl = 'mailto:' + localPart + '@friendsofdt.org';
    e.preventDefault();
    window.open(mailtoUrl, '_self');
  });
});