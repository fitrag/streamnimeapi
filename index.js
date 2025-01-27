const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

app.use(cors());

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.get('/stream/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const url = `https://samehadaku.ac/${slug}/`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // Mengambil data yang dibutuhkan
        const title = $('.infox h2').text().trim();
        const thumbnail = $('.thumb img').attr('src');
        const type = $('.spe span:contains("Tipe:")').text().replace('Tipe:', '').trim();
        const sinopsis = $('.desc.mindes').text().trim();
        const videoUrl = $('#pembed iframe').attr('src').trim();
        const alternativeTitle = $('.alter').text().trim();

        // Mengambil data info anime
        const status = $('.spe span:contains("Status:")').text().replace('Status:', '').trim();
        const studio = $('.spe span:contains("Studio:") a').text().trim();
        const genre = $('.genxed a').map((i, el) => $(el).text()).get();
        const rating = $('.rating strong').text().replace('Rating', '').trim();
        const season = $('.spe span:contains("Season:") a').text().trim();
        const director = $('.spe span:contains("Director:") a').text().trim();
        const releaseYear = $('.spe span:contains("Dirilis:")').text().replace('Dirilis:', '').trim();
        const casts = $('.spe span:contains("Casts:") a').map((i, el) => $(el).text()).get();

        // Mengambil seluruh daftar episode
        const allEpisodes = $('#singlepisode .episodelist ul li').map((i, el) => {
            return {
                episodeTitle: $(el).find('.playinfo h4').text().trim(),
                episodeDate: $(el).find('.playinfo span').text().trim(),
                episodeLink: $(el).find('a').attr('href')?.replace('https://samehadaku.ac/', '') || null,
                episodeImage: $(el).find('.thumbnel img').attr('src')
            }
        }).get();

        // Mengambil link navigasi episode
        const prevLink = $('.naveps .nvs:first-child a').attr('href')?.replace('https://samehadaku.ac/', '') || null;
        const nextLink = $('.naveps .nvs:last-child a').attr('href')?.replace('https://samehadaku.ac/', '') || null;

        const animeData = {
            title,
            alternativeTitle,
            thumbnail,
            type,
            status,
            studio,
            genre,
            sinopsis,
            rating,
            season,
            director,
            releaseYear,
            casts,
            videoUrl,
            allEpisodes,
            prevLink,
            nextLink
        };

        res.json(animeData);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat scraping data' });
    }
});

app.get('/latest', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const url = `https://samehadaku.ac/page/${page}/`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        const latestAnime = [];
        const uniqueTitles = new Set(); // Untuk mengecek duplikasi judul
        
        // Mencari semua item anime terbaru
        $('.listupd .bs').each((i, el) => {
            // Mengambil text dari title dan membersihkan tag HTML
            const title = $(el).find('.tt').clone()    
                .children()                            
                .remove()                             
                .end()                                
                .text()                               
                .trim();                              
            
            // Skip jika judul sudah ada
            if (uniqueTitles.has(title)) {
                return;
            }
            
            uniqueTitles.add(title);
            // Menghapus domain dari link
            const fullLink = $(el).find('a').attr('href');
            const link = fullLink.replace('https://samehadaku.ac/', '');
            const thumbnail = $(el).find('img').attr('src');
            const episode = $(el).find('.epx').text().trim();
            const type = $(el).find('.typez').text().trim();
            
            latestAnime.push({
                title,
                link,
                thumbnail,
                episode,
                type
            });
        });

        // Mengambil informasi pagination dari website
        const totalPages = $('.pagination .page-numbers')
            .not('.next')
            .last()
            .text();

        res.json({
            status: 'success',
            message: 'Data rilisan anime terbaru berhasil didapatkan',
            current_page: page,
            total: latestAnime.length,
            data: latestAnime
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil data rilisan terbaru'
        });
    }
});

app.get('/search', async (req, res) => {
    try {
        const keyword = req.query.keyword;
        
        if (!keyword) {
            return res.status(400).json({
                status: 'error',
                message: 'Parameter keyword diperlukan'
            });
        }

        const url = `https://samehadaku.ac/?s=${encodeURIComponent(keyword)}`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        const searchResults = [];
        
        // Mencari semua item hasil pencarian
        $('.listupd .bs').each((i, el) => {
            const title = $(el).find('.tt').clone()
                .children()
                .remove()
                .end()
                .text()
                .trim();
                
            const fullLink = $(el).find('a').attr('href');
            const link = fullLink.replace('https://samehadaku.ac/', '');
            const thumbnail = $(el).find('img').attr('src');
            
            // Mengambil status dan tipe anime
            const status = $(el).find('.epx').text().trim();
            const type = $(el).find('.typez').text().trim();
            
            searchResults.push({
                title,
                link,
                thumbnail,
                status,
                type
            });
        });

        res.json({
            status: 'success',
            message: `Hasil pencarian untuk: ${keyword}`,
            total: searchResults.length,
            data: searchResults
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat melakukan pencarian'
        });
    }
});

const getAnimeDetail = async (url) => {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        const title = $('h1.entry-title').text().trim();
        const alternativeTitles = $('.alter').text().trim();
        const thumbnail = $('.thumbook .thumb img').attr('src');
        
        // Get info content
        const info = {};
        $('.spe span').each((i, el) => {
            const label = $(el).find('b').text().replace(':', '').trim();
            let value = $(el).text().replace(label + ':', '').trim();
            
            // Handle special cases with links
            if ($(el).find('a').length > 0) {
                value = $(el).find('a').map((i, link) => $(link).text().trim()).get().join(', ');
            }
            
            info[label] = value;
        });

        // Get genres
        const genres = $('.genxed a').map((i, el) => $(el).text().trim()).get();

        // Get synopsis
        const synopsis = $('.entry-content').text().trim();

        // Get characters & voice actors
        const characters = [];
        $('.cvitem').each((i, el) => {
            const char = {
                name: $(el).find('.cvchar .charname').text().trim(),
                role: $(el).find('.cvchar .charrole').text().trim(),
                voice_actor: {
                    name: $(el).find('.cvactor .charname').text().trim(),
                    role: $(el).find('.cvactor .charrole').text().trim()
                }
            };
            characters.push(char);
        });

        // Get episodes list
        const episodes = [];
        $('.eplister ul li').each((i, el) => {
            const episode = {
                number: $(el).find('.epl-num').text().trim(),
                title: $(el).find('.epl-title').text().trim(),
                sub: $(el).find('.epl-sub span').text().trim(),
                date: $(el).find('.epl-date').text().trim(),
                link: $(el).find('a').attr('href')
            };
            episodes.push(episode);
        });

        return {
            title,
            alternative_titles: alternativeTitles,
            thumbnail,
            info,
            genres,
            synopsis,
            characters,
            episodes
        };

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

app.get('/anime/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const url = `https://samehadaku.ac/anime/${slug}/`;
        
        const animeData = await getAnimeDetail(url);

        res.json({
            status: 'success', 
            message: 'Detail anime berhasil didapatkan',
            data: animeData
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil detail anime'
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});