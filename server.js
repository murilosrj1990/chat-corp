const express = require('express');
const path = require('path');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname,'public')));

app.get('/', (req,res)=> {
    res.sendFile(__dirname+"/public/index.html" );
});

app.get('/atendente', (req,res)=> {
    res.sendFile(__dirname+"/public/atendente.html" );
});


let filaEspera=[];

let clientesSendoAtendidos=[];

let atendentesDisponiveis=[];

io.on('connection', socket =>{

    socket.on('abrirAtendimento', cliente=>{ 
        let clienteObj={
            socket: socket,
            nome_cliente: cliente,
            room: null
        };
        
        colocaClienteNaFila(clienteObj);        
        socket.emit('atualizarPosicaoNaFila',posicaoDoClienteNaFila(clienteObj));
        atualizarPosicoesDaFila();
        atualizarListaDeEsperaNosAtendentes();

    });

    function atualizarPosicoesDaFila(){
        if(filaEspera.length>0){
            filaEspera.forEach(cliente => {
                cliente.socket.emit('atualizarPosicaoNaFila',(filaEspera.indexOf(cliente)+1));
            });
        }        
    }
    
    socket.on('atender', function(nomeAtendendente){
        
        //verifica se o cliente que o atendente irá atender está na lista
        let cliente = atendeClienteDafila();
        clientesSendoAtendidos.push(cliente);

        clientesSendoAtendidos.forEach(element => {
            console.log("Fila de de clientes sendo atendidos: "+element);
        });

        filaEspera.forEach(element => {
            console.log("Fila de espera: "+element);
        });
               
        if(cliente != null){
            cliente.room=`${socket.id}`;
            cliente.socket.join(`${socket.id}`);
            console.log("Lista de clientes antes de atender: "+filaEspera.toString());
            console.log("Cliente " +cliente.nome_cliente+" foi atendido. O socket dele é"+cliente.socket.toString());
            console.log("Lista de clientes depois de atender: "+filaEspera.toString());
            let infoAtendimento={
                nome_atendente: nomeAtendendente,
                room: cliente.room
            }
            cliente.socket.emit('iniciarAtendimento',infoAtendimento);
            atualizarPosicoesDaFila();
            atualizarListaDeEsperaNosAtendentes();
        }else{
            atualizarListaDeEsperaNosAtendentes();
        }      
        
    })

    socket.on('entrarComoAtendente', function(){
        
    })

    socket.on('encerrarAtendimento', (objFinalizar)=>{
        console.log(objFinalizar);
        atualizarListaDeEsperaNosAtendentes();
        socket.to(`${objFinalizar.room}`).emit('fecharAtendimentoNoCliente',objFinalizar);
        //socket.emit('fecharAtendimentoNoCliente',objFinalizar);
        let cliente= pesquisarClienteSendoAtendidoPorNome(objFinalizar.nome_cliente);
        if(cliente != null){
            console.log("Nome: "+cliente.nome_cliente+", Room:"+", Socket: "+cliente.socket );
        }
        //cliente.socket.leave(cliente.room);
        
    })

    socket.on('ficarDisponivelNoAtendimento', atendente=>{
        //criar objeto atendente para adicionar a fila de atendentes
        let atendenteObj={
            socket: socket,
            nome_atendente: atendente,
            room: socket.id
        }
        //adicionar objeto atendente a fila de atendentes disponiveis
        atendentesDisponiveis.push(atendenteObj);
        //adicionar atendente a uma sala especifica para isolar chat entre atendente e cliente
        socket.join(atendenteObj.room);
        console.log("Adicionada sala ao atendente: "+atendenteObj.nome_atendente+", com nome :"+atendenteObj.room);
        //enviar fila de espera para atendente
        atualizarListaDeEsperaNosAtendentes();
        console.log(atendente +" está agora disponível para atendimento!");
    })

    socket.on('sendMessage', data => {
        console.log(data.author+" disse: "+data.message+", na sala: "+data.room);
        socket.to(`${data.room}`).emit('receivedMessage', data);
    })

    //coloca cliente na lista de espera
    function colocaClienteNaFila(cliente){
        let taNafila=pesquisarClientePorNome(cliente.nome_cliente);
        if(taNafila==null){
            filaEspera.push(cliente);
            let posicaoNaFila=posicaoDoClienteNaFila(cliente);
            console.log(cliente.nome_cliente+" é o "+(posicaoNaFila)+"º da fila.");
            atualizarListaDeEsperaNosAtendentes();
        }else{
            console.log("já existe cliente com esse nome na fila!");
        }
        
    }

    //retorna cliente da vez e retira da lista de espera
    function atendeClienteDafila(){
        return filaEspera.shift();
    }

    function posicaoDoClienteNaFila(cliente){
        let pos = filaEspera.indexOf(cliente);
        pos = (pos + 1);
        return pos;
    }

    function atualizarPosicaoNaFila(){
        filaEasera.forEach(cliente => {
            let pos = posicaoDoClienteNaFila(cliente);
            cliente.socket.emit('atualizarPosicaoNaFila',pos);
        });
    }

    function atualizarListaDeEsperaNosAtendentes(){
        if(filaEspera.length>0){
            let clienteDaVez=filaEspera[0].nome_cliente;
            console.log(clienteDaVez);
            atendentesDisponiveis.forEach(atendente => {
                //enviar nome dos clientes na lista de espera;
                atendente.socket.emit('filaDeEsperaRecebida',clienteDaVez);
            });
        }else{
            atendentesDisponiveis.forEach(atendente => {
                //enviar nome dos clientes na lista de espera;
                atendente.socket.emit('filaDeEsperaRecebida',null);
            });
        }   
    }

    function pesquisarClientePorNome(nomeCliente){
        filaEspera.forEach(cliente => {
            console.log(cliente.nome_cliente+" " + cliente.socket);
            if(cliente.nome_cliente===nomeCliente){
                return cliente;
            }
        });
        return null;
    }

    function pesquisarClienteSendoAtendidoPorNome(nomeCliente){
        clientesSendoAtendidos.forEach(cliente => {
            console.log("Lista clientes atendidos: "+cliente.nome_cliente+" " + cliente.socket);
            if(cliente.nome_cliente===nomeCliente){
                console.log("Lista clientes atendidos: "+cliente.nome_cliente+" " + cliente.socket);
                return cliente;
            }else{
                return null;
            }
        });
        
    }

});

server.listen(process.env.port || 3333);