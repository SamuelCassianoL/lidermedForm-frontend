 function showModal(message, type = 'success') {
    const modal = document.getElementById('modal-overlay');
    const box = document.getElementById('modal-box');
    const msg = document.getElementById('modal-message');

    msg.textContent = message;

    box.classList.remove('success', 'errorModal');
    box.classList.add(type);

    modal.classList.remove('hidden');
  }

  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
  });


