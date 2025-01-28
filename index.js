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
        let response;

        try {
            response = await axios.get(url);
        } catch (error) {
            // Jika terjadi error, coba ambil dari URL alternatif
            const alternativeUrl = `https://otakudesu.cloud/episode/${slug}/`;
            response = await axios.get(alternativeUrl);
        }

        const $ = cheerio.load(response.data);

        // Cek apakah data diambil dari otakudesu
        const isOtakudesu = response.config.url.includes('otakudesu.cloud');
        if (isOtakudesu) {
            // Mengambil data sesuai dengan struktur HTML otakudesu
            const title = $('.posttl').text().trim();
            const thumbnail = $('.cukder img').attr('src');
            const sinopsis = $('.keyword').text().trim();
            const videoUrl = $('#pembed iframe').attr('src').trim();
            const genres = $('.infozin .infozingle p span').map((i, el) => $(el).text()).get();

            // Mengambil data info anime
            const status = $('.infozin .infozingle p:contains("Status")').text().replace('Status:', '').trim();
            const studio = $('.infozin .infozingle p:contains("Encoder")').text().replace('Encoder:', '').trim();
            const releaseYear = ''; // Data tidak tersedia di struktur ini
            const casts = []; // Data tidak tersedia di struktur ini

            // Mengambil seluruh daftar episode
            const allEpisodes = $('.judul-recommend-anime-series a').map((i, el) => {
                return {
                    episodeTitle: $(el).text().trim(),
                    episodeLink: $(el).attr('href').replace('https://otakudesu.cloud/episode/', '')
                }
            }).get();

            // Mengambil link navigasi episode dari elemen HTML baru
            const prevLink = $('.prevnext .flir a[title="Episode Sebelumnya"]').attr('href')?.replace('https://otakudesu.cloud/episode/', '') || null;
            const nextLink = $('.prevnext .fleft select option:selected').val() !== '0' ? $('.prevnext .fleft select option:selected').val().replace('https://otakudesu.cloud/episode/', '') : null;

            const animeData = {
                title,
                alternativeTitle: '', // Tambahkan alternatif judul jika tersedia
                thumbnail,
                type: 'TV', // Tambahkan tipe anime
                status,
                studio,
                genre: genres,
                sinopsis,
                rating: '0.0', // Tambahkan rating
                season: '', // Tambahkan season jika tersedia
                director: '', // Tambahkan direktur jika tersedia
                releaseYear,
                casts,
                videoUrl,
                allEpisodes,
                prevLink,
                nextLink
            };

            res.json(animeData);
        } else {
            // Mengambil data yang dibutuhkan
            const title = $('.infox h2').text().trim();
            const alternativeTitle = $('.alter').text().trim();
            const thumbnail = $('.thumb img').attr('src');
            const type = $('.spe span:contains("Tipe:")').text().replace('Tipe:', '').trim();
            const sinopsis = $('.desc.mindes').text().trim();
            const videoUrl = $('#pembed iframe').attr('src').trim();

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
        }

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

app.get('/ongoing', async (req, res) => {
    try {
        const url = 'https://otakudesu.cloud/ongoing-anime/';
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        const ongoingAnime = [];

        // Mencari semua item anime yang sedang tayang
        $('.venz .detpost').each((i, el) => {
            const title = $(el).find('.jdlflm').text().trim();
            const episode = $(el).find('.epz').text().trim();
            const episodeDate = $(el).find('.newnime').text().trim();
            const thumbnail = $(el).find('img').attr('src');
            const link = $(el).find('a').attr('href').replace('https://otakudesu.cloud/', '');

            ongoingAnime.push({
                title,
                episode,
                episodeDate,
                thumbnail,
                link
            });
        });

        res.json({
            status: 'success',
            message: 'Data anime yang sedang tayang berhasil didapatkan',
            data: ongoingAnime
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil data anime yang sedang tayang'
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

        const urlSamehadaku = `https://samehadaku.ac/?s=${encodeURIComponent(keyword)}`;
        const responseSamehadaku = await axios.get(urlSamehadaku);
        const $ = cheerio.load(responseSamehadaku.data);
        
        const searchResults = [];
        
        // Mencari semua item hasil pencarian dari samehadaku
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

        // Ambil data dari otakudesu
        const urlOtakudesu = `https://otakudesu.cloud/?s=${encodeURIComponent(keyword)}&post_type=anime`;
        const responseOtakudesu = await axios.get(urlOtakudesu);
        const otaku$ = cheerio.load(responseOtakudesu.data);

        // Mencari semua item hasil pencarian dari otakudesu
        otaku$('.chivsrc li').each((i, el) => {
            const title = otaku$(el).find('h2 a').text().trim();
            const link = otaku$(el).find('h2 a').attr('href').replace('https://otakudesu.cloud/anime/', '');
            const thumbnail = otaku$(el).find('img').attr('src');
            const genres = otaku$(el).find('.set').eq(0).text().replace('Genres : ', '').trim();
            const status = otaku$(el).find('.set').eq(1).text().replace('Status : ', '').trim();
            const rating = otaku$(el).find('.set').eq(2).text().replace('Rating : ', '').trim();

            searchResults.push({
                title,
                link,
                thumbnail,
                genres,
                status,
                rating
            });
        });

        // Menggabungkan hasil pencarian dari kedua sumber secara selang-seling
        const combinedResults = [];
        const uniqueTitles = new Set(); // Untuk mengecek duplikasi judul
        const maxLength = Math.max(searchResults.length, otaku$('.chivsrc li').length);
        
        for (let i = 0; i < maxLength; i++) {
            if (i < searchResults.length) {
                const title = searchResults[i].title;
                if (!uniqueTitles.has(title)) {
                    uniqueTitles.add(title);
                    combinedResults.push(searchResults[i]);
                }
            }
            if (i < otaku$('.chivsrc li').length) {
                const title = otaku$(otaku$('.chivsrc li')[i]).find('h2 a').text().trim();
                if (!uniqueTitles.has(title)) {
                    uniqueTitles.add(title);
                    const link = otaku$(otaku$('.chivsrc li')[i]).find('h2 a').attr('href').replace('https://otakudesu.cloud/anime/', '');
                    const thumbnail = otaku$(otaku$('.chivsrc li')[i]).find('img').attr('src');
                    const genres = otaku$(otaku$('.chivsrc li')[i]).find('.set').eq(0).text().replace('Genres : ', '').trim();
                    const status = otaku$(otaku$('.chivsrc li')[i]).find('.set').eq(1).text().replace('Status : ', '').trim();
                    const rating = otaku$(otaku$('.chivsrc li')[i]).find('.set').eq(2).text().replace('Rating : ', '').trim();

                    combinedResults.push({
                        title,
                        link,
                        thumbnail,
                        genres,
                        status,
                        rating
                    });
                }
            }
        }

        res.json({
            status: 'success',
            message: `Hasil pencarian untuk: ${keyword}`,
            total: combinedResults.length,
            data: combinedResults
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
        
        // Cek apakah data diambil dari otakudesu
        if (url.includes('otakudesu.cloud')) {
            const title = $('.jdlrx h1').text().trim();
            const alternativeTitles = $('.infozingle span:contains("Japanese")').text().trim();
            const thumbnail = $('.fotoanime img').attr('src');
            
            // Mengambil informasi anime dari struktur HTML baru
            const info = {
                Status: $('.infozingle span:contains("Status")').text().replace('Status:', '').trim(),
                Studio: $('.infozingle span:contains("Studio")').text().replace('Studio:', '').trim(),
                Dirilis: $('.infozingle span:contains("Tanggal Rilis")').text().replace('Tanggal Rilis:', '').trim(),
                Season: $('.infozingle span:contains("Season")').text().replace('Season:', '').trim(),
                Tipe: $('.infozingle span:contains("Tipe")').text().replace('Tipe:', '').trim(),
                Director: $('.infozingle span:contains("Director")').text().replace('Director:', '').trim(),
                'Diposting oleh': $('.infozingle span:contains("Diposting oleh")').text().replace('Diposting oleh:', '').trim(),
                'Diperbarui pada': $('.infozingle span:contains("Diperbarui pada")').text().replace('Diperbarui pada:', '').trim()
            };

            const synopsis = $('.sinopc').text().trim();

            // Ambil daftar episode
            const episodes = [];
            $('.episodelist ul li').each((i, el) => {
                const episode = {
                    title: $(el).find('a').text().trim(),
                    date: $(el).find('.zeebr').text().trim(),
                    link: $(el).find('a').attr('href').replace('https://otakudesu.cloud/episode/', '')
                };
                episodes.push(episode);
            });

            const genres = $('.infozingle span:contains("Genre")').text().replace('Genre:', '').trim().split(', ');

            return {
                title,
                alternative_titles: alternativeTitles,
                thumbnail,
                info,
                synopsis,
                genres,
                episodes
            };
        } else {
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
                    link: $(el).find('a').attr('href').replace('https://samehadaku.ac/', '')
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
        }

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

app.get('/anime/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const url = `https://samehadaku.ac/anime/${slug}/`;
        
        let animeData;

        try {
            animeData = await getAnimeDetail(url);
        } catch (error) {
            console.error('Error fetching from primary URL:', error);
            // Jika terjadi error, coba ambil dari URL alternatif
            const alternativeUrl = `https://otakudesu.cloud/anime/${slug}/`;
            animeData = await getAnimeDetail(alternativeUrl);
        }

        // Cek jika animeData masih kosong setelah mencoba kedua URL
        if (!animeData) {
            return res.status(404).json({
                status: 'error',
                message: 'Anime tidak ditemukan'
            });
        }

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

app.get('/latest/random', async (req, res) => {
    try {
        // Mengambil data dari endpoint /latest
        const page = parseInt(req.query.page) || 1;
        const latestResponse = await axios.get(`https://samehadaku.ac/page/${page}/`);
        const latest$ = cheerio.load(latestResponse.data);
        
        const latestAnime = [];
        const uniqueTitles = new Set(); // Untuk mengecek duplikasi judul
        
        // Mencari semua item anime terbaru
        latest$('.listupd .bs').each((i, el) => {
            const title = latest$(el).find('.tt').clone()    
                .children()                            
                .remove()                             
                .end()                                
                .text()                               
                .trim();                              
            
            if (uniqueTitles.has(title)) {
                return;
            }
            
            uniqueTitles.add(title);
            const fullLink = latest$(el).find('a').attr('href');
            const link = fullLink.replace('https://samehadaku.ac/', '');
            const thumbnail = latest$(el).find('img').attr('src');
            const episode = latest$(el).find('.epx').text().trim();
            const type = latest$(el).find('.typez').text().trim();
            
            latestAnime.push({
                title,
                link,
                episode,
                thumbnail,
                type
            });
        });

        // Mengambil data dari endpoint /ongoing
        const ongoingResponse = await axios.get(`https://otakudesu.cloud/ongoing-anime/page/${page}`);
        const ongoing$ = cheerio.load(ongoingResponse.data);
        
        const ongoingAnime = [];

        // Mencari semua item anime yang sedang tayang
        ongoing$('.venz .detpost').each((i, el) => {
            const title = ongoing$(el).find('.jdlflm').text().trim();
            const episode = ongoing$(el).find('.epz').text().trim();
            const thumbnail = ongoing$(el).find('img').attr('src');
            const link = ongoing$(el).find('a').attr('href').replace('https://otakudesu.cloud/anime/', '');

            ongoingAnime.push({
                title,
                link,
                episode,
                thumbnail,
                type: 'Ongoing' // Menambahkan tipe untuk anime yang sedang tayang
            });
        });

        // Menggabungkan kedua array secara selang-seling
        const combinedAnime = [];
        const maxLength = Math.max(latestAnime.length, ongoingAnime.length);
        for (let i = 0; i < maxLength; i++) {
            if (i < latestAnime.length) {
                combinedAnime.push(latestAnime[i]);
            }
            if (i < ongoingAnime.length) {
                combinedAnime.push(ongoingAnime[i]);
            }
        }

        res.json({
            status: 'success',
            message: 'Data anime terbaru dan yang sedang tayang berhasil didapatkan dan diacak',
            data: combinedAnime
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Terjadi kesalahan saat mengambil data anime'
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});