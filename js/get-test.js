// Função para buscar um usuário específico (GET)
function getUser() {
      fetch("https://jsonplaceholder.typicode.com/users/1") // Pegando usuário de ID 1
            .then(response => response.json())
            .then(data => {
                  document.getElementById("result").innerText = JSON.stringify(data, null, 2);
            })
            .catch(error => console.error("Erro na requisição GET:", error));
}

// Função para atualizar um usuário (PUT)
function updateUser() {
      const updatedData = {
            name: "Novo Nome",
            email: "novoemail@example.com",
            phone: "1234-5678"
      };

      fetch("https://jsonplaceholder.typicode.com/users/1", {
            method: "PUT",
            headers: {
                  "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedData)
      })
            .then(response => {
                  if (!response.ok) {
                        throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
                  }
                  return response.json();
            })
            .then(data => {
                  console.log("Usuário atualizado:", data);
                  document.getElementById("result").innerText = "Usuário atualizado:\n" + JSON.stringify(data, null, 2);
            })
            .catch(error => console.error("Erro na requisição PUT:", error));
}


// Associando funções aos botões
document.getElementById("getUserButton").addEventListener("click", getUser);
document.getElementById("updateUserButton").addEventListener("click", updateUser);
