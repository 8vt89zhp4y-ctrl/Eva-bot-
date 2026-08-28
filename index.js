const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
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
// EMBED DE BRAINROT
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
            .setDescription('Precio en Robux. Ejemplo: 4.2')
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

// ================================
// PANEL NORMAL ?VALORES
// ================================

function crearPanelValores(brainrots, pagina) {

    const porPagina = 25;

    const totalPaginas = Math.max(
        1,
        Math.ceil(brainrots.length / porPagina)
    );

    const inicio = pagina * porPagina;

    const lista = brainrots.slice(
        inicio,
        inicio + porPagina
    );

    const opciones = lista.map(brainrot => ({
        label: brainrot.nombre.substring(0, 100),
        value: brainrot._id.toString()
    }));

    const menu = new StringSelectMenuBuilder()
        .setCustomId(
            `valores_select_${pagina}`
        )
        .setPlaceholder(
            '🔎 Busca o selecciona un Brainrot'
        )
        .addOptions(opciones);

    const filaMenu = new ActionRowBuilder()
        .addComponents(menu);

    const anterior = new ButtonBuilder()
        .setCustomId(
            `valores_prev_${pagina}`
        )
        .setLabel('Anterior')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pagina === 0);

    const siguiente = new ButtonBuilder()
        .setCustomId(
            `valores_next_${pagina}`
        )
        .setLabel('Siguiente')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(
            pagina >= totalPaginas - 1
        );

    const sumar = new ButtonBuilder()
        .setCustomId(
            `valores_sumar_${pagina}`
        )
        .setLabel('Sumar valores')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success);

    const filaBotones = new ActionRowBuilder()
        .addComponents(
            anterior,
            sumar,
            siguiente
        );

    const embed = new EmbedBuilder()
        .setTitle('📚 VALORES DE BRAINROTS')
        .setDescription(
            '🔎 **Selecciona un Brainrot para consultar su información.**\n\n' +
            `📦 Brainrots registrados: **${brainrots.length}**\n` +
            `📄 Página: **${pagina + 1}/${totalPaginas}**`
        )
        .setTimestamp();

    return {
        embeds: [embed],
        components: [
            filaMenu,
            filaBotones
        ]
    };
}

// ================================
// PANEL DE SUMA
// ================================

function crearPanelSuma(brainrots, pagina) {

    const porPagina = 25;

    const totalPaginas = Math.max(
        1,
        Math.ceil(brainrots.length / porPagina)
    );

    const inicio = pagina * porPagina;

    const lista = brainrots.slice(
        inicio,
        inicio + porPagina
    );

    const opciones = lista.map(brainrot => ({
        label: brainrot.nombre.substring(0, 100),
        description: `Valor: ${brainrot.valor}`.substring(0, 100),
        value: brainrot._id.toString()
    }));

    const menu = new StringSelectMenuBuilder()
        .setCustomId(
            `suma_select_${pagina}`
        )
        .setPlaceholder(
            '➕ Selecciona varios Brainrots'
        )
        .setMinValues(1)
        .setMaxValues(opciones.length)
        .addOptions(opciones);

    const filaMenu = new ActionRowBuilder()
        .addComponents(menu);

    const calcular = new ButtonBuilder()
        .setCustomId(
            `suma_calcular_${pagina}`
        )
        .setLabel('Calcular')
        .setEmoji('🧮')
        .setStyle(ButtonStyle.Success);

    const cancelar = new ButtonBuilder()
        .setCustomId(
            `suma_cancelar_${pagina}`
        )
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger);

    const anterior = new ButtonBuilder()
        .setCustomId(
            `suma_prev_${pagina}`
        )
        .setLabel('Anterior')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(pagina === 0);

    const siguiente = new ButtonBuilder()
        .setCustomId(
            `suma_next_${pagina}`
        )
        .setLabel('Siguiente')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(
            pagina >= totalPaginas - 1
        );

    const filaBotones = new ActionRowBuilder()
        .addComponents(
            anterior,
            cancelar,
            calcular,
            siguiente
        );

    const embed = new EmbedBuilder()
        .setTitle('🧮 SUMAR VALORES')
        .setDescription(
            'Selecciona **uno o varios Brainrots**.\n\n' +
            '💎 **Únicamente se sumará el Valor de cada Brainrot.**\n\n' +
            `📦 Brainrots registrados: **${brainrots.length}**\n` +
            `📄 Página: **${pagina + 1}/${totalPaginas}**`
        )
        .setTimestamp();

    return {
        embeds: [embed],
        components: [
            filaMenu,
            filaBotones
        ]
    };
}

// ================================
// INTERACCIONES
// ================================

client.on('interactionCreate', async interaction => {

    // ================================
    // SLASH COMMANDS
    // ================================

    if (interaction.isChatInputCommand()) {

        // ================================
        // /ADD
        // ================================

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

                const embed =
                    crearEmbedBrainrot(brainrot);

                await interaction.channel.send({
                    embeds: [embed]
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

        // ================================
        // /UPDATE
        // ================================

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
                        '❌ El precio debe ser un número. Ejemplo: `2500.5`',
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

                const embed =
                    crearEmbedBrainrot(brainrot);

                await interaction.channel.send({
                    embeds: [embed]
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

    // ================================
    // SELECTOR NORMAL
    // ================================

    if (interaction.isStringSelectMenu()) {

        if (
            interaction.customId.startsWith(
                'valores_select_'
            )
        ) {

            const brainrotId =
                interaction.values[0];

            try {

                const brainrot =
                    await Brainrot.findById(
                        brainrotId
                    );

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

            return;
        }

        // ================================
        // SELECTOR DE SUMA
        // ================================

        if (
            interaction.customId.startsWith(
                'suma_select_'
            )
        ) {

            // Guardamos los IDs seleccionados
            // dentro de la respuesta de interacción
            const ids = interaction.values.join(',');

            const pagina =
                interaction.customId.split('_')[2];

            const brainrots =
                await Brainrot.find()
                    .sort({ nombre: 1 });

            const panel =
                crearPanelSuma(
                    brainrots,
                    Number(pagina)
                );

            // Cambiamos el customId del botón
            // para incluir temporalmente los IDs
            panel.components[1].components[2]
                .setCustomId(
                    `suma_calcular_${pagina}_${ids}`
                );

            await interaction.update(panel);

            return;
        }
    }

    // ================================
    // BOTONES
    // ================================

    if (interaction.isButton()) {

        // ================================
        // BOTONES DEL PANEL ?VALORES
        // ================================

        if (
            interaction.customId.startsWith(
                'valores_'
            )
        ) {

            const partes =
                interaction.customId.split('_');

            const accion = partes[1];

            const paginaActual =
                Number(partes[2]);

            try {

                const brainrots =
                    await Brainrot.find()
                        .sort({ nombre: 1 });

                if (!brainrots.length) {
                    return interaction.update({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(
                                    '📚 VALORES DE BRAINROTS'
                                )
                                .setDescription(
                                    '❌ No hay Brainrots registrados.'
                                )
                        ],
                        components: []
                    });
                }

                if (accion === 'sumar') {

                    const panel =
                        crearPanelSuma(
                            brainrots,
                            paginaActual
                        );

                    return interaction.update(
                        panel
                    );
                }

                let nuevaPagina =
                    paginaActual;

                if (accion === 'prev') {
                    nuevaPagina--;
                }

                if (accion === 'next') {
                    nuevaPagina++;
                }

                const totalPaginas =
                    Math.ceil(
                        brainrots.length / 25
                    );

                nuevaPagina =
                    Math.max(
                        0,
                        Math.min(
                            nuevaPagina,
                            totalPaginas - 1
                        )
                    );

                const panel =
                    crearPanelValores(
                        brainrots,
                        nuevaPagina
                    );

                await interaction.update(
                    panel
                );

            } catch (error) {

                console.error(error);

                await interaction.reply({
                    content:
                        '❌ Ocurrió un error.',
                    ephemeral: true
                });
            }

            return;
        }

        // ================================
        // BOTONES DE SUMA
        // ================================

        if (
            interaction.customId.startsWith(
                'suma_'
            )
        ) {

            const partes =
                interaction.customId.split('_');

            const accion =
                partes[1];

            const pagina =
                Number(partes[2]);

            // ============================
            // CANCELAR
            // ============================

            if (accion === 'cancelar') {

                const brainrots =
                    await Brainrot.find()
                        .sort({ nombre: 1 });

                return interaction.update(
                    crearPanelValores(
                        brainrots,
                        pagina
                    )
                );
            }

            // ============================
            // CALCULAR
            // ============================

            if (accion === 'calcular') {

                const ids =
                    partes
                        .slice(3)
                        .join('_')
                        .split(',');

                try {

                    const brainrots =
                        await Brainrot.find({
                            _id: {
                                $in: ids
                            }
                        });

                    if (!brainrots.length) {
                        return interaction.reply({
                            content:
                                '❌ No se seleccionaron Brainrots válidos.',
                            ephemeral: true
                        });
                    }

                    let total = 0;

                    const lista =
                        brainrots.map(
                            brainrot => {

                                const valor =
                                    parseFloat(
                                        String(
                                            brainrot.valor
                                        ).replace(
                                            ',',
                                            '.'
                                        )
                                    );

                                if (
                                    Number.isNaN(
                                        valor
                                    )
                                ) {
                                    return `❌ ${brainrot.nombre} — valor inválido`;
                                }

                                total += valor;

                                return `💎 **${brainrot.nombre}** — ${brainrot.valor}`;
                            }
                        );

                    const totalFormateado =
                        Number.isInteger(total)
                            ? total.toString()
                            : total.toFixed(10)
                                .replace(
                                    /0+$/,
                                    ''
                                )
                                .replace(
                                    /\.$/,
                                    ''
                                );

                    const embed =
                        new EmbedBuilder()
                            .setTitle(
                                '🧮 SUMA DE VALORES'
                            )
                            .setDescription(
                                lista.join('\n') +
                                `\n\n━━━━━━━━━━━━━━━━━━\n` +
                                `💎 **TOTAL: ${totalFormateado}**`
                            )
                            .setTimestamp();

                    return interaction.update({
                        embeds: [embed],
                        components: []
                    });

                } catch (error) {

                    console.error(
                        '❌ Error calculando suma:',
                        error
                    );

                    return interaction.reply({
                        content:
                            '❌ Ocurrió un error al calcular la suma.',
                        ephemeral: true
                    });
                }
            }

            // ============================
            // PAGINACIÓN DE SUMA
            // ============================

            if (
                accion === 'prev' ||
                accion === 'next'
            ) {

                const brainrots =
                    await Brainrot.find()
                        .sort({ nombre: 1 });

                let nuevaPagina =
                    pagina;

                if (accion === 'prev') {
                    nuevaPagina--;
                }

                if (accion === 'next') {
                    nuevaPagina++;
                }

                const totalPaginas =
                    Math.ceil(
                        brainrots.length / 25
                    );

                nuevaPagina =
                    Math.max(
                        0,
                        Math.min(
                            nuevaPagina,
                            totalPaginas - 1
                        )
                    );

                return interaction.update(
                    crearPanelSuma(
                        brainrots,
                        nuevaPagina
                    )
                );
            }
        }
    }
});

// ================================
// ?VALOR
// ================================

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

// ================================
// ?VALORES
// ================================

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

        await message.reply(
            crearPanelValores(
                brainrots,
                0
            )
        );

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

// ================================
// LOGIN
// ================================

client.login(process.env.TOKEN);
