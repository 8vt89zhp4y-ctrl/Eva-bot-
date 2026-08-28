const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const mongoose = require('mongoose');
require('dotenv').config();

// ================================
// CLIENTE
// ================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================================
// MODELO DE BRAINROTS
// ================================

const brainrotSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },

    imagen: {
        type: String,
        required: true
    },

    valor: {
        type: String,
        required: true
    },

    demanda: {
        type: String,
        required: true,
        trim: true
    },

    precio: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Brainrot = mongoose.model('Brainrot', brainrotSchema);

// ================================
// VALIDAR NÚMEROS
// ================================

function validarNumero(numero) {
    return /^\d+(\.\d+)?$/.test(numero);
}

// ================================
// EMBED BRAINROT
// ================================

function crearEmbedBrainrot(brainrot) {

    const fecha = brainrot.updatedAt || brainrot.createdAt;

    const timestamp = Math.floor(
        fecha.getTime() / 1000
    );

    return new EmbedBuilder()
        .setDescription(
            `🕐 **Última actualización:** <t:${timestamp}:F>`
        )
        .setTitle(`🛠️ ${brainrot.nombre}`)
        .setImage(brainrot.imagen)
        .addFields(
            {
                name: '💎 Valor',
                value: brainrot.valor,
                inline: true
            },
            {
                name: '📊 Demanda',
                value: brainrot.demanda,
                inline: true
            },
            {
                name: '💲 Precio',
                value: `${brainrot.precio} Robux`,
                inline: true
            }
        )
        .setTimestamp();
}

// ================================
// /ADD
// ================================

const addCommand = new SlashCommandBuilder()
    .setName('add')
    .setDescription('Añade un Brainrot')
    .addStringOption(option =>
        option
            .setName('nombre')
            .setDescription('Nombre del Brainrot')
            .setRequired(true)
    )
    .addAttachmentOption(option =>
        option
            .setName('imagen')
            .setDescription('Imagen del Brainrot')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('valor')
            .setDescription('Valor. Ejemplo: 4.2')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('demanda')
            .setDescription('Demanda del Brainrot')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('precio')
            .setDescription('Precio en Robux')
            .setRequired(true)
    );

// ================================
// /UPDATE
// ================================

const updateCommand = new SlashCommandBuilder()
    .setName('update')
    .setDescription('Actualiza un Brainrot existente')
    .addStringOption(option =>
        option
            .setName('nombre')
            .setDescription('Nombre actual del Brainrot')
            .setRequired(true)
    )
    .addAttachmentOption(option =>
        option
            .setName('imagen')
            .setDescription('Nueva imagen')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('valor')
            .setDescription('Nuevo valor. Ejemplo: 4.2')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('demanda')
            .setDescription('Nueva demanda')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('precio')
            .setDescription('Nuevo precio en Robux')
            .setRequired(true)
    );

// ================================
// CONEXIÓN MONGODB
// ================================

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Conectado a MongoDB');
    })
    .catch(error => {
        console.error(
            '❌ Error conectando a MongoDB:',
            error
        );
    });

// ================================
// BOT LISTO
// ================================

client.once('ready', async () => {

    console.log(
        `✅ Bot conectado como ${client.user.tag}`
    );

    try {

        await client.application.commands.set([
            addCommand.toJSON(),
            updateCommand.toJSON()
        ]);

        console.log(
            '✅ Comandos /add y /update registrados correctamente'
        );

    } catch (error) {

        console.error(
            '❌ Error registrando comandos:',
            error
        );
    }
});

// ==================================================
// FUNCIÓN PARA BUSCAR BRAINROT POR NOMBRE
// ==================================================

async function buscarBrainrot(nombre) {

    let texto = nombre
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (!texto) return null;

    // Quitar espacios extras
    texto = texto.replace(/\s+/g, ' ');

    // Escapar caracteres especiales
    const escaparRegex = texto =>
        texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // ================================
    // 1. COINCIDENCIA EXACTA
    // ================================

    let brainrot = await Brainrot.findOne({
        nombre: {
            $regex: `^${escaparRegex(texto)}$`,
            $options: 'i'
        }
    });

    if (brainrot) return brainrot;

    // ================================
    // 2. QUITAR PLURAL
    // ================================

    let singular = texto;

    if (singular.endsWith('es')) {
        singular = singular.slice(0, -2);
    } else if (singular.endsWith('s')) {
        singular = singular.slice(0, -1);
    }

    brainrot = await Brainrot.findOne({
        nombre: {
            $regex: `^${escaparRegex(singular)}$`,
            $options: 'i'
        }
    });

    if (brainrot) return brainrot;

    // ================================
    // 3. BÚSQUEDA PARCIAL
    // ================================

    brainrot = await Brainrot.findOne({
        nombre: {
            $regex: escaparRegex(texto),
            $options: 'i'
        }
    });

    if (brainrot) return brainrot;

    // ================================
    // 4. BÚSQUEDA CON SINGULAR
    // ================================

    brainrot = await Brainrot.findOne({
        nombre: {
            $regex: escaparRegex(singular),
            $options: 'i'
        }
    });

    if (brainrot) return brainrot;

    return null;
}

// ==================================================
// PARSEAR LISTA DE BRAINROTS
// ==================================================

async function procesarLista(texto) {

    const lineas = texto
        .split(/[\n,]+/)
        .map(linea => linea.trim())
        .filter(Boolean);

    const resultados = [];

    for (const linea of lineas) {

        /*
        Formatos aceptados:

        10 garamas
        3 skibidis
        2 dragones

        También:
        10x garamas
        10 x garamas
        */

        const coincidencia = linea.match(
            /^(\d+(?:\.\d+)?)\s*(?:x\s*)?(.+)$/i
        );

        if (!coincidencia) {
            resultados.push({
                texto: linea,
                error: true
            });

            continue;
        }

        const cantidad = parseFloat(
            coincidencia[1]
        );

        const nombreBuscado =
            coincidencia[2].trim();

        const brainrot =
            await buscarBrainrot(nombreBuscado);

        if (!brainrot) {

            resultados.push({
                texto: linea,
                nombre: nombreBuscado,
                error: true
            });

            continue;
        }

        const valorUnitario =
            parseFloat(
                String(brainrot.valor)
                    .replace(',', '.')
            );

        if (Number.isNaN(valorUnitario)) {

            resultados.push({
                texto: linea,
                nombre: brainrot.nombre,
                error: true
            });

            continue;
        }

        const valorTotal =
            cantidad * valorUnitario;

        resultados.push({
            cantidad,
            nombre: brainrot.nombre,
            valorUnitario,
            valorTotal,
            error: false
        });
    }

    return resultados;
}

// ==================================================
// CALCULAR TOTAL
// ==================================================

function calcularTotal(lista) {

    return lista.reduce(
        (total, item) => {

            if (item.error) {
                return total;
            }

            return total + item.valorTotal;

        },
        0
    );
}

// ==================================================
// FORMATEAR NÚMERO
// ==================================================

function formatearNumero(numero) {

    if (Number.isInteger(numero)) {
        return numero.toString();
    }

    return Number(
        numero.toFixed(10)
    ).toString();
}

// ==================================================
// CREAR EMBED WFL
// ==================================================

function crearEmbedWFL(datos) {

    const diferencia =
        datos.totalRecibes -
        datos.totalDas;

    let resultado;
    let emoji;

    const tolerancia = 0.000001;

    if (Math.abs(diferencia) <= tolerancia) {

        resultado = 'FAIR';
        emoji = '🟡';

    } else if (diferencia > 0) {

        resultado = 'WIN';
        emoji = '🟢';

    } else {

        resultado = 'LOSE';
        emoji = '🔴';
    }

    const listaDas =
        datos.das
            .map(item => {

                if (item.error) {
                    return `❌ **${item.texto}** — no encontrado`;
                }

                return `• ${item.cantidad}x **${item.nombre}** — ${formatearNumero(item.valorTotal)}`;
            })
            .join('\n');

    const listaRecibes =
        datos.recibes
            .map(item => {

                if (item.error) {
                    return `❌ **${item.texto}** — no encontrado`;
                }

                return `• ${item.cantidad}x **${item.nombre}** — ${formatearNumero(item.valorTotal)}`;
            })
            .join('\n');

    return new EmbedBuilder()
        .setTitle(`${emoji} WFL — ${resultado}`)
        .addFields(
            {
                name: '🟢 TÚ DAS',
                value:
                    `${listaDas || 'Nada'}\n\n` +
                    `💎 **Total: ${formatearNumero(datos.totalDas)}**`
            },
            {
                name: '🔵 TE DAN',
                value:
                    `${listaRecibes || 'Nada'}\n\n` +
                    `💎 **Total: ${formatearNumero(datos.totalRecibes)}**`
            },
            {
                name: '⚖️ RESULTADO',
                value:
                    `🟢 Tú das: **${formatearNumero(datos.totalDas)}**\n` +
                    `🔵 Recibes: **${formatearNumero(datos.totalRecibes)}**\n` +
                    `📊 Diferencia: **${diferencia >= 0 ? '+' : ''}${formatearNumero(diferencia)}**\n\n` +
                    `${emoji} **${resultado}**`
            }
        )
        .setTimestamp();
}

// ==================================================
// PANEL WFL
// ==================================================

function crearPanelWFL() {

    const embed = new EmbedBuilder()
        .setTitle('⚖️ WFL — CALCULADORA DE TRADES')
        .setDescription(
            'Compara el valor de un intercambio usando los Brainrots registrados.\n\n' +

            '🟢 **TÚ DAS**\n' +
            'Escribe los Brainrots que estás dando.\n' +
            'Ejemplo: `10 garamas, 3 skibidis`\n\n' +

            '🔵 **TE DAN**\n' +
            'Escribe los Brainrots que vas a recibir.\n' +
            'Ejemplo: `1 dragón, 5 garamas`\n\n' +

            '💡 Puedes poner cantidades diferentes.\n' +
            'Ejemplo: `10 garamas` significa **10 × valor de Garama**.'
        )
        .setFooter({
            text: 'Los valores utilizados son los registrados en /add'
        });

    const darButton = new ButtonBuilder()
        .setCustomId('wfl_das')
        .setLabel('Tú das')
        .setEmoji('🟢')
        .setStyle(ButtonStyle.Success);

    const recibesButton = new ButtonBuilder()
        .setCustomId('wfl_recibes')
        .setLabel('Te dan')
        .setEmoji('🔵')
        .setStyle(ButtonStyle.Primary);

    const resultadoButton = new ButtonBuilder()
        .setCustomId('wfl_resultado')
        .setLabel('Ver resultado')
        .setEmoji('⚖️')
        .setStyle(ButtonStyle.Secondary);

    const limpiarButton = new ButtonBuilder()
        .setCustomId('wfl_limpiar')
        .setLabel('Limpiar')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger);

    const fila = new ActionRowBuilder()
        .addComponents(
            darButton,
            recibesButton,
            resultadoButton,
            limpiarButton
        );

    return {
        embeds: [embed],
        components: [fila]
    };
}

// ==================================================
// DATOS TEMPORALES WFL
// ==================================================

const wflData = new Map();

// ==================================================
// INTERACCIONES
// ==================================================

client.on('interactionCreate', async interaction => {

    // ==================================================
    // SLASH COMMANDS
    // ==================================================

    if (interaction.isChatInputCommand()) {

        // ==================================================
        // /ADD
        // ==================================================

        if (interaction.commandName === 'add') {

            const nombre =
                interaction.options.getString('nombre');

            const imagen =
                interaction.options.getAttachment('imagen');

            let valor =
                interaction.options.getString('valor');

            const demanda =
                interaction.options.getString('demanda');

            let precio =
                interaction.options.getString('precio');

            valor = valor.replace(',', '.');
            precio = precio.replace(',', '.');

            if (!validarNumero(valor)) {
                return interaction.reply({
                    content:
                        '❌ El valor debe ser un número. Ejemplo: `4.2`',
                    ephemeral: true
                });
            }

            if (!validarNumero(precio)) {
                return interaction.reply({
                    content:
                        '❌ El precio debe ser un número. Ejemplo: `2500.5`',
                    ephemeral: true
                });
            }

            try {

                const brainrot =
                    await Brainrot.create({
                        nombre,
                        imagen: imagen.url,
                        valor,
                        demanda,
                        precio
                    });

                await interaction.channel.send({
                    embeds: [
                        crearEmbedBrainrot(
                            brainrot
                        )
                    ]
                });

                await interaction.reply({
                    content:
                        '✅ Brainrot añadido correctamente.',
                    ephemeral: true
                });

            } catch (error) {

                console.error(
                    '❌ Error guardando Brainrot:',
                    error
                );

                await interaction.reply({
                    content:
                        '❌ Ocurrió un error al guardar el Brainrot.',
                    ephemeral: true
                });
            }

            return;
        }

        // ==================================================
        // /UPDATE
        // ==================================================

        if (interaction.commandName === 'update') {

            const nombre =
                interaction.options.getString('nombre');

            const imagen =
                interaction.options.getAttachment('imagen');

            let valor =
                interaction.options.getString('valor');

            const demanda =
                interaction.options.getString('demanda');

            let precio =
                interaction.options.getString('precio');

            valor = valor.replace(',', '.');
            precio = precio.replace(',', '.');

            if (!validarNumero(valor)) {
                return interaction.reply({
                    content:
                        '❌ El valor debe ser un número. Ejemplo: `4.2`',
                    ephemeral: true
                });
            }

            if (!validarNumero(precio)) {
                return interaction.reply({
                    content:
                        '❌ El precio debe ser un número.',
                    ephemeral: true
                });
            }

            try {

                const nombreEscapado =
                    nombre.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&'
                    );

                const brainrot =
                    await Brainrot.findOne({
                        nombre: {
                            $regex:
                                `^${nombreEscapado}$`,
                            $options: 'i'
                        }
                    });

                if (!brainrot) {
                    return interaction.reply({
                        content:
                            `❌ No existe ningún Brainrot llamado **${nombre}**.`,
                        ephemeral: true
                    });
                }

                brainrot.imagen =
                    imagen.url;

                brainrot.valor =
                    valor;

                brainrot.demanda =
                    demanda;

                brainrot.precio =
                    precio;

                await brainrot.save();

                await interaction.channel.send({
                    embeds: [
                        crearEmbedBrainrot(
                            brainrot
                        )
                    ]
                });

                await interaction.reply({
                    content:
                        `✅ **${brainrot.nombre}** actualizado correctamente.`,
                    ephemeral: true
                });

            } catch (error) {

                console.error(
                    '❌ Error actualizando Brainrot:',
                    error
                );

                await interaction.reply({
                    content:
                        '❌ Ocurrió un error al actualizar el Brainrot.',
                    ephemeral: true
                });
            }

            return;
        }
    }

    // ==================================================
    // BOTONES
    // ==================================================

    if (interaction.isButton()) {

        // ==================================================
        // TÚ DAS
        // ==================================================

        if (interaction.customId === 'wfl_das') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'wfl_modal_das'
                    )
                    .setTitle(
                        '🟢 Tú das'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'wfl_das_input'
                    )
                    .setLabel(
                        '¿Qué estás dando?'
                    )
                    .setPlaceholder(
                        '10 garamas, 3 skibidis'
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            await interaction.showModal(
                modal
            );

            return;
        }

        // ==================================================
        // TE DAN
        // ==================================================

        if (interaction.customId === 'wfl_recibes') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'wfl_modal_recibes'
                    )
                    .setTitle(
                        '🔵 Te dan'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'wfl_recibes_input'
                    )
                    .setLabel(
                        '¿Qué vas a recibir?'
                    )
                    .setPlaceholder(
                        '1 dragón, 5 garamas'
                    )
                    .setStyle(
                        TextInputStyle.Paragraph
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            await interaction.showModal(
                modal
            );

            return;
        }

        // ==================================================
        // RESULTADO
        // ==================================================

        if (
            interaction.customId ===
            'wfl_resultado'
        ) {

            const datos =
                wflData.get(
                    interaction.user.id
                );

            if (!datos) {

                return interaction.reply({
                    content:
                        '❌ Primero introduce lo que das y lo que recibes.',
                    ephemeral: true
                });
            }

            if (
                !datos.das ||
                !datos.recibes
            ) {

                return interaction.reply({
                    content:
                        '❌ Debes completar **Tú das** y **Te dan** antes de calcular.',
                    ephemeral: true
                });
            }

            const totalDas =
                calcularTotal(
                    datos.das
                );

            const totalRecibes =
                calcularTotal(
                    datos.recibes
                );

            const embed =
                crearEmbedWFL({
                    das: datos.das,
                    recibes: datos.recibes,
                    totalDas,
                    totalRecibes
                });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            return;
        }

        // ==================================================
        // LIMPIAR
        // ==================================================

        if (
            interaction.customId ===
            'wfl_limpiar'
        ) {

            wflData.delete(
                interaction.user.id
            );

            await interaction.reply({
                content:
                    '🗑️ Se borraron los datos de tu WFL.',
                ephemeral: true
            });

            return;
        }
    }

    // ==================================================
    // MODALES
    // ==================================================

    if (interaction.isModalSubmit()) {

        // ==================================================
        // MODAL TÚ DAS
        // ==================================================

        if (
            interaction.customId ===
            'wfl_modal_das'
        ) {

            const texto =
                interaction.fields.getTextInputValue(
                    'wfl_das_input'
                );

            const lista =
                await procesarLista(
                    texto
                );

            let datos =
                wflData.get(
                    interaction.user.id
                ) || {};

            datos.das =
                lista;

            wflData.set(
                interaction.user.id,
                datos
            );

            const errores =
                lista.filter(
                    item => item.error
                );

            if (errores.length) {

                return interaction.reply({
                    content:
                        '⚠️ Se guardó tu oferta, pero algunos Brainrots no fueron encontrados:\n\n' +
                        errores
                            .map(
                                e =>
                                    `❌ ${e.texto || e.nombre}`
                            )
                            .join('\n'),
                    ephemeral: true
                });
            }

            await interaction.reply({
                content:
                    '✅ Se guardó correctamente lo que das.',
                ephemeral: true
            });

            return;
        }

        // ==================================================
        // MODAL TE DAN
        // ==================================================

        if (
            interaction.customId ===
            'wfl_modal_recibes'
        ) {

            const texto =
                interaction.fields.getTextInputValue(
                    'wfl_recibes_input'
                );

            const lista =
                await procesarLista(
                    texto
                );

            let datos =
                wflData.get(
                    interaction.user.id
                ) || {};

            datos.recibes =
                lista;

            wflData.set(
                interaction.user.id,
                datos
            );

            const errores =
                lista.filter(
                    item => item.error
                );

            if (errores.length) {

                return interaction.reply({
                    content:
                        '⚠️ Se guardó tu oferta, pero algunos Brainrots no fueron encontrados:\n\n' +
                        errores
                            .map(
                                e =>
                                    `❌ ${e.texto || e.nombre}`
                            )
                            .join('\n'),
                    ephemeral: true
                });
            }

            await interaction.reply({
                content:
                    '✅ Se guardó correctamente lo que recibes.',
                ephemeral: true
            });

            return;
        }
    }
});

// ==================================================
// ?VALOR
// ==================================================

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    if (
        !message.content
            .toLowerCase()
            .startsWith('?valor')
    ) {
        return;
    }

    const busqueda =
        message.content
            .slice(6)
            .trim();

    if (!busqueda) {
        return message.reply(
            '❌ Escribe el nombre o parte del nombre del Brainrot.\n\n' +
            'Ejemplo: `?valor skibidi`'
        );
    }

    try {

        const palabras =
            busqueda
                .split(/\s+/)
                .filter(Boolean);

        const regex =
            palabras
                .map(palabra =>
                    palabra.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&'
                    )
                )
                .join('.*');

        const brainrots =
            await Brainrot.find({
                nombre: {
                    $regex: regex,
                    $options: 'i'
                }
            })
            .limit(25);

        if (!brainrots.length) {

            return message.reply(
                `❌ No encontré ningún Brainrot relacionado con **${busqueda}**.`
            );
        }

        if (brainrots.length === 1) {

            return message.reply({
                embeds: [
                    crearEmbedBrainrot(
                        brainrots[0]
                    )
                ]
            });
        }

        const botones =
            brainrots.map(brainrot =>
                new ButtonBuilder()
                    .setCustomId(
                        `brainrot_${brainrot._id}`
                    )
                    .setLabel(
                        brainrot.nombre.substring(
                            0,
                            80
                        )
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

        const filas = [];

        for (
            let i = 0;
            i < botones.length;
            i += 5
        ) {

            filas.push(
                new ActionRowBuilder()
                    .addComponents(
                        botones.slice(
                            i,
                            i + 5
                        )
                    )
            );
        }

        const embed =
            new EmbedBuilder()
                .setTitle(
                    '🔎 Resultados de búsqueda'
                )
                .setDescription(
                    `Encontré **${brainrots.length}** Brainrots relacionados con:\n` +
                    `**${busqueda}**\n\n` +
                    'Selecciona el que estás buscando.'
                )
                .setTimestamp();

        await message.reply({
            embeds: [embed],
            components: filas
        });

    } catch (error) {

        console.error(
            '❌ Error buscando Brainrot:',
            error
        );

        await message.reply(
            '❌ Ocurrió un error al buscar el Brainrot.'
        );
    }
});

// ==================================================
// ?VALORES
// ==================================================

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    if (
        message.content
            .toLowerCase()
            .trim() !== '?valores'
    ) {
        return;
    }

    try {

        const brainrots =
            await Brainrot.find()
                .sort({ nombre: 1 });

        if (!brainrots.length) {

            return message.reply(
                '❌ No hay Brainrots registrados todavía.'
            );
        }

        const porPagina = 25;

        const pagina = 0;

        const totalPaginas =
            Math.ceil(
                brainrots.length /
                porPagina
            );

        const lista =
            brainrots.slice(
                0,
                porPagina
            );

        const opciones =
            lista.map(brainrot => ({
                label:
                    brainrot.nombre.substring(
                        0,
                        100
                    ),
                value:
                    brainrot._id.toString()
            }));

        const menu =
            new StringSelectMenuBuilder()
                .setCustomId(
                    'valores_select'
                )
                .setPlaceholder(
                    '🔎 Busca o selecciona un Brainrot'
                )
                .addOptions(
                    opciones
                );

        const fila =
            new ActionRowBuilder()
                .addComponents(
                    menu
                );

        const embed =
            new EmbedBuilder()
                .setTitle(
                    '📚 VALORES DE BRAINROTS'
                )
                .setDescription(
                    '🔎 **Selecciona un Brainrot para consultar su información.**\n\n' +
                    `📦 Brainrots registrados: **${brainrots.length}**\n` +
                    `📄 Página: **${pagina + 1}/${totalPaginas}**`
                )
                .setTimestamp();

        await message.reply({
            embeds: [embed],
            components: [fila]
        });

    } catch (error) {

        console.error(
            '❌ Error creando panel:',
            error
        );

        await message.reply(
            '❌ Ocurrió un error al cargar los valores.'
        );
    }
});

// ==================================================
// ?WFL
// ==================================================

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    if (
        message.content
            .toLowerCase()
            .trim() !== '?wfl'
    ) {
        return;
    }

    wflData.delete(
        message.author.id
    );

    await message.reply(
        crearPanelWFL()
    );
});

// ==================================================
// BOTONES DE ?VALOR
// ==================================================

client.on('interactionCreate', async interaction => {

    if (!interaction.isButton()) return;

    if (
        !interaction.customId.startsWith(
            'brainrot_'
        )
    ) {
        return;
    }

    const id =
        interaction.customId.replace(
            'brainrot_',
            ''
        );

    try {

        const brainrot =
            await Brainrot.findById(id);

        if (!brainrot) {

            return interaction.reply({
                content:
                    '❌ Ese Brainrot ya no existe.',
                ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [
                crearEmbedBrainrot(
                    brainrot
                )
            ],
            ephemeral: true
        });

    } catch (error) {

        console.error(error);

        await interaction.reply({
            content:
                '❌ Ocurrió un error.',
            ephemeral: true
        });
    }
});

// ==================================================
// SELECTOR DE ?VALORES
// ==================================================

client.on('interactionCreate', async interaction => {

    if (!interaction.isStringSelectMenu()) {
        return;
    }

    if (
        interaction.customId !==
        'valores_select'
    ) {
        return;
    }

    const id =
        interaction.values[0];

    try {

        const brainrot =
            await Brainrot.findById(id);

        if (!brainrot) {

            return interaction.reply({
                content:
                    '❌ Ese Brainrot ya no existe.',
                ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [
                crearEmbedBrainrot(
                    brainrot
                )
            ],
            ephemeral: true
        });

    } catch (error) {

        console.error(error);

        await interaction.reply({
            content:
                '❌ Ocurrió un error.',
            ephemeral: true
        });
    }
});

// ==================================================
// LOGIN
// ==================================================

client.login(process.env.TOKEN);
